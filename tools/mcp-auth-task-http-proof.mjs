#!/usr/bin/env node

import process from 'process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const REQUIRED_TOOLS = [
  'browser_authenticated_task_prepare',
  'browser_authenticated_task_status',
  'browser_authenticated_task_resume',
  'browser_authenticated_task_cancel',
];

function usage() {
  console.error(
    'Usage: node tools/mcp-auth-task-http-proof.mjs <job> <profile> <target-url> <expected-text> [login-url]'
  );
}

function parseToolResult(result, toolName) {
  const textItem = result?.content?.find((item) => item?.type === 'text');
  if (!textItem?.text) {
    throw new Error(`${toolName} returned no text result.`);
  }

  try {
    return JSON.parse(textItem.text);
  } catch {
    throw new Error(`${toolName} returned non-JSON text.`);
  }
}

function assertState(data, expectedState, label) {
  if (data?.state !== expectedState) {
    throw new Error(`${label} expected state ${expectedState}, received ${data?.state || 'unknown'}.`);
  }
  if (data?.publicGatewayStarted !== false) {
    throw new Error(`${label} unexpectedly reported a public gateway start.`);
  }
}

async function main() {
  const [job, profile, targetUrl, expectedText, loginUrl = ''] = process.argv.slice(2);
  if (!job || !profile || !targetUrl || !expectedText) {
    usage();
    process.exitCode = 23;
    return;
  }

  const endpoint = process.env.MCP_AUTH_TASK_PROOF_URL || 'http://127.0.0.1:3003/mcp';
  const client = new Client({ name: 's22-phase-7q-b-proof', version: '1.0.0' });
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

    const prepareArguments = { job, profile, targetUrl, expectedText };
    if (loginUrl) {
      prepareArguments.loginUrl = loginUrl;
    }

    const prepared = parseToolResult(
      await client.callTool({
        name: 'browser_authenticated_task_prepare',
        arguments: prepareArguments,
      }),
      'browser_authenticated_task_prepare'
    );
    assertState(prepared, 'ready', 'prepare');
    if (prepared.approvalRequired !== false) {
      throw new Error('prepare unexpectedly requires approval for the valid test profile.');
    }
    console.log('PASS: prepare returned ready without starting a public gateway.');

    const status = parseToolResult(
      await client.callTool({
        name: 'browser_authenticated_task_status',
        arguments: { job },
      }),
      'browser_authenticated_task_status'
    );
    assertState(status, 'ready', 'status');
    console.log('PASS: status returned saved ready state.');

    const resumed = parseToolResult(
      await client.callTool({
        name: 'browser_authenticated_task_resume',
        arguments: { job },
      }),
      'browser_authenticated_task_resume'
    );
    assertState(resumed, 'ready', 'resume');
    console.log('PASS: resume re-verified the authenticated profile.');

    const cancelled = parseToolResult(
      await client.callTool({
        name: 'browser_authenticated_task_cancel',
        arguments: { job },
      }),
      'browser_authenticated_task_cancel'
    );
    assertState(cancelled, 'cancelled', 'cancel');
    console.log('PASS: cancel closed the lifecycle metadata.');

    console.log('PASS: Phase 7Q-B local MCP authenticated-task proof completed.');
    console.log('No VNC, noVNC, Cloudflare tunnel, public route, credential, or storageState value was used.');
  } finally {
    await transport.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error?.message || error}`);
  process.exitCode = 1;
});
