#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const REQUIRED_TOOLS = [
  'browser_authenticated_login_gateway_start',
  'browser_authenticated_login_gateway_status',
  'browser_authenticated_login_gateway_complete',
  'browser_authenticated_login_gateway_cancel',
];

async function main() {
  const endpoint = process.env.MCP_LOGIN_GATEWAY_PROOF_URL || 'http://127.0.0.1:3003/mcp';
  const client = new Client({ name: 's22-phase-7q-c2-list-proof', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint));

  try {
    await client.connect(transport);
    console.log(`PASS: connected to local MCP HTTP endpoint: ${endpoint}`);

    const listed = await client.listTools();
    const available = new Set(listed.tools.map((tool) => tool.name));

    for (const name of REQUIRED_TOOLS) {
      if (!available.has(name)) {
        throw new Error(`required MCP tool missing: ${name}`);
      }
      console.log(`PASS: MCP tool listed: ${name}`);
    }

    console.log('PASS: Phase 7Q-C2 MCP login-gateway tools are registered.');
    console.log('No gateway action was called. VNC, noVNC, Cloudflare, credentials, and storageState were not used.');
  } finally {
    await transport.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error?.message || error}`);
  process.exitCode = 1;
});
