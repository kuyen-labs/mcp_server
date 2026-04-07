export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  /** Epoch milliseconds when access_token is expected to expire. */
  expires_at_ms: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}
