import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

async function main(): Promise<void> {
  const server = new McpServer({
    name: '@fuul/mcp-server',
    version: '0.1.0',
  });

  server.tool('ping', 'Returns pong if the MCP server process is running.', async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
