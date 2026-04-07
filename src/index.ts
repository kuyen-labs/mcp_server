import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { OAuthClient } from './auth/oauth-client.js';
import { TokenStore } from './auth/token-store.js';
import { loadEnv } from './config/env.js';
import { ApiRequestError, FuulApiClient, NotLoggedInError } from './http/fuul-api-client.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const store = new TokenStore();
  const oauth = new OAuthClient(env, store);
  const api = new FuulApiClient(env, store, oauth);

  const server = new McpServer({
    name: '@fuul/mcp-server',
    version: '0.1.0',
  });

  server.tool('ping', 'Returns pong if the MCP server process is running.', async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));

  server.tool(
    'whoami',
    'Returns the current Fuul user from GET /api/v1/auth/user. Requires prior `fuul-mcp login` (tokens in ~/.fuul/tokens.json).',
    async () => {
      try {
        const user = await api.getAuthUser();
        return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
      } catch (e) {
        const message =
          e instanceof NotLoggedInError
            ? e.message
            : e instanceof ApiRequestError
              ? `Failed to load user (HTTP ${e.status}). Run \`fuul-mcp login\` and retry.`
              : e instanceof Error
                ? e.message
                : String(e);
        return {
          content: [{ type: 'text', text: message }],
          isError: true,
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
