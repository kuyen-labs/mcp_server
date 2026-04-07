#!/usr/bin/env node
import axios from 'axios';

import { OAuthClient } from './auth/oauth-client.js';
import { TokenStore } from './auth/token-store.js';
import { apiOriginFromEnv, loadEnv } from './config/env.js';

function printUsage(): void {
  console.log(`Usage: fuul-mcp <command>

Commands:
  login   Open browser to sign in and save tokens to ~/.fuul/tokens.json
  logout  Remove saved tokens
  whoami  Print the current user from GET /api/v1/auth/user

Environment:
  FUUL_API_BASE_URL         API origin (default https://api.fuul.xyz)
  FUUL_OAUTH_CLIENT_ID      OAuth client id (default fuul-agent)
  FUUL_OAUTH_REDIRECT_URI   Callback URL (default http://127.0.0.1:8765/callback)
  FUUL_MCP_DEBUG            Set to 1 or true for debug logs on stderr
`);
}

async function whoami(): Promise<void> {
  const env = loadEnv();
  const store = new TokenStore();
  const oauth = new OAuthClient(env, store);
  let tokens = await store.read();
  if (!tokens) {
    console.error('Not logged in. Run: fuul-mcp login');
    process.exit(1);
  }

  const origin = apiOriginFromEnv(env);
  const fetchUser = async (accessToken: string) =>
    axios.get(`${origin}/api/v1/auth/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30_000,
      validateStatus: () => true,
    });

  let res = await fetchUser(tokens.access_token);
  if (res.status === 401 && tokens.refresh_token) {
    const refreshed = await oauth.refreshFromStore();
    if (refreshed) {
      tokens = refreshed;
      res = await fetchUser(tokens.access_token);
    }
  }

  if (res.status !== 200) {
    console.error(`Failed to load user (HTTP ${res.status}). Try: fuul-mcp login`);
    process.exit(1);
  }

  console.log(JSON.stringify(res.data, null, 2));
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const env = loadEnv();
  const store = new TokenStore();
  const oauth = new OAuthClient(env, store);

  switch (cmd) {
    case 'login':
      await oauth.login();
      break;
    case 'logout':
      await store.clear();

      console.log('Logged out.');
      break;
    case 'whoami':
      await whoami();
      break;
    default:
      printUsage();
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
