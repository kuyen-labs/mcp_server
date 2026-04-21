import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

import { OAuthClient } from '../auth/oauth-client.js';
import { TokenStore } from '../auth/token-store.js';
import { apiOriginFromEnv, type Env } from '../config/env.js';
import { formatRateLimitMessage, parseRetryAfterFromHeaders } from './retry-after.js';

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
    /** Seconds until retry when HTTP 429 and Retry-After is present. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type AuthorizedRequestOptions = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  /** Query string params (GET, etc.). */
  params?: Record<string, unknown>;
  data?: unknown;
};

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
    const res = await this.executeAuthorizedRequest<unknown>({
      method: 'GET',
      url: '/api/v1/auth/user',
    });
    if (res.status !== 200) {
      throw apiErrorFromResponse(res);
    }
    return res.data;
  }

  /**
   * Authenticated GET (Bearer + refresh on 401). Exposes status and headers for cacheable endpoints (e.g. metadata).
   */
  async getAuthorized(
    url: string,
    extraHeaders?: Record<string, string>,
    query?: Record<string, unknown>,
  ): Promise<{
    status: number;
    data: unknown;
    etag: string | undefined;
    cacheControl: string | undefined;
    retryAfterSeconds: number | undefined;
  }> {
    const res = await this.executeAuthorizedRequest<unknown>({
      method: 'GET',
      url,
      headers: extraHeaders,
      params: query,
    });
    return {
      status: res.status,
      data: res.data,
      etag: readHeader(res, 'etag'),
      cacheControl: readHeader(res, 'cache-control'),
      retryAfterSeconds: parseRetryAfterFromHeaders(res.headers),
    };
  }

  /**
   * GET expecting 2xx JSON body; throws {@link ApiRequestError} otherwise (including 429 with retry hint).
   */
  async getJson(url: string, options?: { query?: Record<string, unknown>; headers?: Record<string, string> }): Promise<unknown> {
    const res = await this.executeAuthorizedRequest<unknown>({
      method: 'GET',
      url,
      headers: options?.headers,
      params: options?.query,
    });
    throwIfNotSuccess(res);
    return res.data;
  }

  async postJson(url: string, body: unknown): Promise<unknown> {
    const res = await this.executeAuthorizedRequest<unknown>({
      method: 'POST',
      url,
      data: body,
    });
    throwIfNotSuccess(res);
    return res.data;
  }

  async patchJson(url: string, body: unknown): Promise<unknown> {
    const res = await this.executeAuthorizedRequest<unknown>({
      method: 'PATCH',
      url,
      data: body,
    });
    throwIfNotSuccess(res);
    return res.data;
  }

  private async executeAuthorizedRequest<T>(opts: AuthorizedRequestOptions): Promise<AxiosResponse<T>> {
    let tokens = await this.tokenStore.read();
    if (!tokens?.access_token) {
      throw new NotLoggedInError();
    }

    const run = (accessToken: string) =>
      this.http.request<T>({
        method: opts.method,
        url: opts.url,
        headers: { Authorization: `Bearer ${accessToken}`, ...opts.headers },
        params: opts.params,
        data: opts.data,
      });

    let res = await run(tokens.access_token);

    if (res.status === 401 && tokens.refresh_token) {
      const refreshed = await this.oauth.refreshFromStore();
      if (refreshed) {
        tokens = refreshed;
        res = await run(tokens.access_token);
      }
    }

    return res;
  }
}

export function throwIfNotSuccess(res: AxiosResponse): void {
  if (res.status >= 200 && res.status < 300) {
    return;
  }
  throw apiErrorFromResponse(res);
}

function apiErrorFromResponse(res: AxiosResponse): ApiRequestError {
  if (res.status === 429) {
    const retryAfter = parseRetryAfterFromHeaders(res.headers);
    return new ApiRequestError(formatRateLimitMessage(retryAfter), 429, res.data, retryAfter);
  }
  return new ApiRequestError(messageFromBody(res.data, res.status), res.status, res.data);
}

function messageFromBody(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.message === 'string') {
      return o.message;
    }
    if (Array.isArray(o.message)) {
      return o.message.map(String).join('; ');
    }
  }
  return `Request failed (HTTP ${status})`;
}

function readHeader(res: AxiosResponse, name: string): string | undefined {
  const raw = res.headers[name] ?? res.headers[name.toLowerCase()];
  if (raw == null) {
    return undefined;
  }
  return Array.isArray(raw) ? String(raw[0]) : String(raw);
}
