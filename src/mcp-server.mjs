#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createS22McpServer } from './mcp-core.mjs';
import { registerAuthenticatedTaskTools } from './mcp-auth-task-tools.mjs';

async function main() {
  const server = createS22McpServer();
  registerAuthenticatedTaskTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
