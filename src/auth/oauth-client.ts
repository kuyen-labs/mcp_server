import http from 'node:http';
import { URL } from 'node:url';

import axios, { type AxiosInstance } from 'axios';
import open from 'open';

import { apiOriginFromEnv, type Env } from '../config/env.js';
import { createCodeChallengeS256, createCodeVerifier, createOAuthState } from './pkce.js';
import { TokenStore } from './token-store.js';
import type { StoredTokens, TokenResponse } from './types.js';

const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;

export class OAuthClient {
  constructor(
    private readonly env: Env,
    private readonly tokenStore: TokenStore,
  ) {}

  private log(...args: unknown[]): void {
    if (this.env.debug) {
      console.error('[fuul-mcp]', ...args);
    }
  }

  private http(): AxiosInstance {
    const baseURL = apiOriginFromEnv(this.env);
    return axios.create({
      baseURL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
  }

  async login(): Promise<void> {
    const origin = apiOriginFromEnv(this.env);
    const verifier = createCodeVerifier();
    const challenge = createCodeChallengeS256(verifier);
    const state = createOAuthState();
    const redirectUri = this.env.FUUL_OAUTH_REDIRECT_URI;

    const { port, hostname, pathname } = parseRedirect(redirectUri);

    const authorizeUrl = new URL(`${origin}/oauth/authorize`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', this.env.FUUL_OAUTH_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    const codePromise = captureAuthorizationCode({
      port,
      hostname,
      pathname,
      expectedState: state,
      timeoutMs: LOGIN_TIMEOUT_MS,
      log: this.log.bind(this),
    });

    this.log('Opening browser for login:', authorizeUrl.toString());
    await open(authorizeUrl.toString());

    const { code } = await codePromise;

    const client = this.http();
    const tokenRes = await client.post<TokenResponse>('/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.env.FUUL_OAUTH_CLIENT_ID,
      code_verifier: verifier,
    });

    if (tokenRes.status !== 200 || !tokenRes.data?.access_token) {
      const body = tokenRes.data as { error_description?: string } | undefined;
      const msg = body?.error_description || `Token exchange failed (HTTP ${tokenRes.status})`;
      throw new Error(msg);
    }

    const tokens = tokenResponseToStored(tokenRes.data);
    await this.tokenStore.write(tokens);

    console.log('Logged in. Tokens saved to ~/.fuul/tokens.json');
  }

  async refreshFromStore(): Promise<StoredTokens | null> {
    const current = await this.tokenStore.read();
    if (!current?.refresh_token) {
      return null;
    }
    const client = this.http();
    const tokenRes = await client.post<TokenResponse>('/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: current.refresh_token,
    });
    if (tokenRes.status !== 200 || !tokenRes.data?.access_token) {
      return null;
    }
    const tokens = tokenResponseToStored(tokenRes.data);
    await this.tokenStore.write(tokens);
    return tokens;
  }
}

function tokenResponseToStored(data: TokenResponse): StoredTokens {
  const expires_at_ms = Date.now() + Math.max(0, data.expires_in) * 1000;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at_ms,
  };
}

function parseRedirect(redirectUri: string): { port: number; hostname: string; pathname: string } {
  const u = new URL(redirectUri);
  const port = u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
  const hostname = u.hostname;
  const pathname = u.pathname || '/';
  return { port, hostname, pathname };
}

interface CaptureOpts {
  port: number;
  hostname: string;
  pathname: string;
  expectedState: string;
  timeoutMs: number;
  log: (...args: unknown[]) => void;
}

function captureAuthorizationCode(opts: CaptureOpts): Promise<{ code: string }> {
  const { port, hostname, pathname, expectedState, timeoutMs, log } = opts;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        server.close();
        reject(new Error('Login timed out waiting for browser redirect'));
      }
    }, timeoutMs);

    const server = http.createServer((req, res) => {
      void (async () => {
        try {
          const hostUrl = `http://${req.headers.host ?? `${hostname}:${port}`}`;
          const url = new URL(req.url ?? '/', hostUrl);

          if (url.pathname !== pathname) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }

          const oauthError = url.searchParams.get('error');
          if (oauthError) {
            const desc = url.searchParams.get('error_description') ?? oauthError;
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<p>Authorization error: ${escapeHtml(desc)}</p>`);
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              server.close();
              reject(new Error(desc));
            }
            return;
          }

          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          if (!code || state !== expectedState) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<p>Invalid callback (missing code or state mismatch).</p>');
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              server.close();
              reject(new Error('Invalid OAuth callback'));
            }
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<p>Login complete. You can close this window.</p>');
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            server.close(() => resolve({ code }));
          }
        } catch (e) {
          log(e);
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            server.close();
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        }
      })();
    });

    server.on('error', (e) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(e);
      }
    });

    server.listen(port, hostname, () => {
      log(`Listening for OAuth callback on http://${hostname}:${port}${pathname}`);
    });
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
