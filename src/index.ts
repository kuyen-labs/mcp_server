import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { OAuthClient } from './auth/oauth-client.js';
import { TokenStore } from './auth/token-store.js';
import { loadEnv } from './config/env.js';
import { ApiRequestError, FuulApiClient, NotLoggedInError } from './http/fuul-api-client.js';
import { MetadataService } from './metadata/metadata-service.js';
import { ToolTimeoutError, withTimeout } from './util/with-timeout.js';

function toolErrorPayload(e: unknown, httpDetail = 'Request failed'): { content: [{ type: 'text'; text: string }]; isError: true } {
  const message =
    e instanceof ToolTimeoutError
      ? `${e.message} Increase FUUL_MCP_TOOL_TIMEOUT_MS if the API is slow.`
      : e instanceof NotLoggedInError
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
  const toolTimeoutMs = env.FUUL_MCP_TOOL_TIMEOUT_MS;

  const server = new McpServer({
    name: '@fuul/mcp-server',
    version: '0.1.0',
  });

  // Empty `{}` input shape so clients get a proper JSON Schema (some UIs hide tools with no inputSchema).
  server.tool('ping', 'Returns pong if the MCP server process is running.', {}, async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));

  server.tool(
    'whoami',
    'Returns the current Fuul user from GET /api/v1/auth/user. Requires prior `fuul-mcp login` (tokens in ~/.fuul/tokens.json).',
    {},
    async () => {
      try {
        const user = await withTimeout(api.getAuthUser(), toolTimeoutMs, 'whoami');
        return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e, 'Failed to load user');
      }
    },
  );

  server.tool(
    'list_chains',
    'Lists supported chains from GET /public-api/v1/metadata/chains (cached; respects Cache-Control / ETag when present).',
    {},
    async () => {
      try {
        const data = await withTimeout(metadata.getChains(), toolTimeoutMs, 'list_chains');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e);
      }
    },
  );

  server.tool('list_trigger_types', 'Lists trigger type metadata from GET /public-api/v1/metadata/trigger-types (cached).', {}, async () => {
    try {
      const data = await withTimeout(metadata.getTriggerTypes(), toolTimeoutMs, 'list_trigger_types');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e);
    }
  });

  server.tool('list_payout_schemas', 'Lists payout schema metadata from GET /public-api/v1/metadata/payout-schemas (cached).', {}, async () => {
    try {
      const data = await withTimeout(metadata.getPayoutSchemas(), toolTimeoutMs, 'list_payout_schemas');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
