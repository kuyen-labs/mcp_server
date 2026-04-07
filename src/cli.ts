#!/usr/bin/env node
import { OAuthClient } from './auth/oauth-client.js';
import { TokenStore } from './auth/token-store.js';
import { loadEnv } from './config/env.js';
import { ApiRequestError, FuulApiClient, NotLoggedInError } from './http/fuul-api-client.js';

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
  const api = new FuulApiClient(env, store, oauth);

  try {
    const user = await api.getAuthUser();
    console.log(JSON.stringify(user, null, 2));
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      console.error(e.message);
      process.exit(1);
    }
    if (e instanceof ApiRequestError) {
      console.error(`Failed to load user (HTTP ${e.status}). Try: fuul-mcp login`);
      process.exit(1);
    }
    throw e;
  }
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
