import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { OAuthClient } from './auth/oauth-client.js';
import { TokenStore } from './auth/token-store.js';
import { loadEnv } from './config/env.js';
import { ApiRequestError, FuulApiClient, NotLoggedInError } from './http/fuul-api-client.js';
import { MetadataService } from './metadata/metadata-service.js';

function toolErrorPayload(
  e: unknown,
  httpDetail = 'Request failed',
): { content: [{ type: 'text'; text: string }]; isError: true } {
  const message =
    e instanceof NotLoggedInError
      ? e.message
      : e instanceof ApiRequestError
        ? `${httpDetail} (HTTP ${e.status}). Run \`fuul-mcp login\` if you are not authenticated.`
        : e instanceof Error
          ? e.message
          : String(e);
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function main(): Promise<void> {
  const env = loadEnv();
  const store = new TokenStore();
  const oauth = new OAuthClient(env, store);
  const api = new FuulApiClient(env, store, oauth);
  const metadata = new MetadataService(api);

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
        return toolErrorPayload(e, 'Failed to load user');
      }
    },
  );

  server.tool('list_chains', 'Lists supported chains from GET /public-api/v1/metadata/chains (cached; respects Cache-Control / ETag when present).', async () => {
    try {
      const data = await metadata.getChains();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e);
    }
  });

  server.tool(
    'list_trigger_types',
    'Lists trigger type metadata from GET /public-api/v1/metadata/trigger-types (cached).',
    async () => {
      try {
        const data = await metadata.getTriggerTypes();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e);
      }
    },
  );

  server.tool(
    'list_payout_schemas',
    'Lists payout schema metadata from GET /public-api/v1/metadata/payout-schemas (cached).',
    async () => {
      try {
        const data = await metadata.getPayoutSchemas();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e);
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
