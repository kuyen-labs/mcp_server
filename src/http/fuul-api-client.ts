import axios, { type AxiosInstance } from 'axios';

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
    return this.authorizedGet('/api/v1/auth/user');
  }

  private async authorizedGet<T = unknown>(url: string): Promise<T> {
    let tokens = await this.tokenStore.read();
    if (!tokens?.access_token) {
      throw new NotLoggedInError();
    }

    const get = (accessToken: string) =>
      this.http.get<T>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

    let res = await get(tokens.access_token);

    if (res.status === 401 && tokens.refresh_token) {
      const refreshed = await this.oauth.refreshFromStore();
      if (refreshed) {
        tokens = refreshed;
        res = await get(tokens.access_token);
      }
    }

    if (res.status !== 200) {
      throw new ApiRequestError(`Request failed (HTTP ${res.status})`, res.status, res.data);
    }

    return res.data as T;
  }
}
