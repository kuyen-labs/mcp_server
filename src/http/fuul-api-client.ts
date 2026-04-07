import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

import { OAuthClient } from '../auth/oauth-client.js';
import { TokenStore } from '../auth/token-store.js';
import { apiOriginFromEnv, type Env } from '../config/env.js';

const REQUEST_TIMEOUT_MS = 30_000;

export class NotLoggedInError extends Error {
  readonly code = 'NOT_LOGGED_IN' as const;

  constructor() {
    super('Not logged in. Run: fuul-mcp login');
    this.name = 'NotLoggedInError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiRequestError extends Error {
  readonly code = 'API_REQUEST_ERROR' as const;

  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Authenticated Fuul API client: Bearer from ~/.fuul/tokens.json, refresh + one retry on 401.
 */
export class FuulApiClient {
  private readonly http: AxiosInstance;

  constructor(
    env: Env,
    private readonly tokenStore: TokenStore,
    private readonly oauth: OAuthClient,
  ) {
    this.http = axios.create({
      baseURL: apiOriginFromEnv(env),
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
  }

  /** GET /api/v1/auth/user — same contract as `fuul-mcp whoami`. */
  async getAuthUser(): Promise<unknown> {
    const res = await this.executeAuthorizedGet<unknown>('/api/v1/auth/user');
    if (res.status !== 200) {
      throw new ApiRequestError(`Request failed (HTTP ${res.status})`, res.status, res.data);
    }
    return res.data;
  }

  /**
   * Authenticated GET (Bearer + refresh on 401). Exposes status and headers for cacheable endpoints (e.g. metadata).
   */
  async getAuthorized(
    url: string,
    extraHeaders?: Record<string, string>,
  ): Promise<{ status: number; data: unknown; etag: string | undefined; cacheControl: string | undefined }> {
    const res = await this.executeAuthorizedGet<unknown>(url, extraHeaders);
    return {
      status: res.status,
      data: res.data,
      etag: readHeader(res, 'etag'),
      cacheControl: readHeader(res, 'cache-control'),
    };
  }

  private async executeAuthorizedGet<T>(
    url: string,
    extraHeaders?: Record<string, string>,
  ): Promise<AxiosResponse<T>> {
    let tokens = await this.tokenStore.read();
    if (!tokens?.access_token) {
      throw new NotLoggedInError();
    }

    const get = (accessToken: string) =>
      this.http.get<T>(url, {
        headers: { Authorization: `Bearer ${accessToken}`, ...extraHeaders },
      });

    let res = await get(tokens.access_token);

    if (res.status === 401 && tokens.refresh_token) {
      const refreshed = await this.oauth.refreshFromStore();
      if (refreshed) {
        tokens = refreshed;
        res = await get(tokens.access_token);
      }
    }

    return res;
  }
}

function readHeader(res: AxiosResponse, name: string): string | undefined {
  const raw = res.headers[name] ?? res.headers[name.toLowerCase()];
  if (raw == null) {
    return undefined;
  }
  return Array.isArray(raw) ? String(raw[0]) : String(raw);
}
