#!/usr/bin/env node

import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const EXPECTED_TOOLS = [
  'browser_task_handoff',
  'browser_task_run',
  'browser_task_status',
  'job_radar_get_page',
  'job_radar_get_report',
  'job_radar_health',
  'job_radar_list_pages',
  'job_radar_scan',
].sort();

const LEGACY_TOOLS = [
  'browser_inspect_url',
  'browser_scan_url',
  'browser_scan_with_profile',
  'browser_start_manual_login',
  'browser_manual_login_status',
  'browser_complete_manual_login',
  'browser_cancel_manual_login',
  'browser_authenticated_task_prepare',
  'browser_authenticated_task_status',
  'browser_authenticated_task_resume',
  'browser_authenticated_task_cancel',
  'browser_authenticated_login_gateway_start',
  'browser_authenticated_login_gateway_status',
  'browser_authenticated_login_gateway_complete',
  'browser_authenticated_login_gateway_cancel',
];

const PNG_SIGNATURE = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
]);

function parseJsonText(result, toolName) {
  const textItem = result?.content?.find(
    (item) => item?.type === 'text'
  );

  if (!textItem?.text) {
    throw new Error(
      `${toolName} returned no text content.`
    );
  }

  if (
    textItem.text.includes('screenshotPath') ||
    textItem.text.includes(
      '.runtime/browser-tasks'
    )
  ) {
    throw new Error(
      `${toolName} exposed an internal screenshot path.`
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(textItem.text);
  } catch {
    throw new Error(
      `${toolName} returned non-JSON text content.`
    );
  }

  if (result?.isError || parsed?.ok === false) {
    throw new Error(
      `${toolName} failed: ${
        parsed?.error ||
        parsed?.message ||
        textItem.text
      }`
    );
  }

  return {
    parsed,
    text: textItem.text,
  };
}

function validatePngImage(result, toolName) {
  const imageItem = result?.content?.find(
    (item) => item?.type === 'image'
  );

  if (!imageItem) {
    throw new Error(
      `${toolName} returned no MCP image content.`
    );
  }

  if (imageItem.mimeType !== 'image/png') {
    throw new Error(
      `${toolName} returned unexpected image type: ${imageItem.mimeType}`
    );
  }

  const buffer = Buffer.from(
    imageItem.data || '',
    'base64'
  );

  if (
    buffer.length < PNG_SIGNATURE.length ||
    !buffer
      .subarray(0, PNG_SIGNATURE.length)
      .equals(PNG_SIGNATURE)
  ) {
    throw new Error(
      `${toolName} returned invalid PNG data.`
    );
  }

  return buffer.length;
}

async function callJsonTool(
  client,
  name,
  args,
  {
    requireImage = false,
  } = {}
) {
  const result = await client.callTool({
    name,
    arguments: args,
  });

  const { parsed } =
    parseJsonText(result, name);

  let imageBytes = 0;

  if (requireImage) {
    imageBytes =
      validatePngImage(result, name);

    if (
      parsed?.mcpImage?.attached !== true ||
      parsed?.mcpImage?.mimeType !==
        'image/png'
    ) {
      throw new Error(
        `${name} text metadata did not confirm the attached PNG.`
      );
    }
  }

  return {
    result,
    data: parsed,
    imageBytes,
  };
}

async function main() {
  const job =
    process.argv[2] ||
    'mcp-unified-example-proof';

  const startUrl =
    process.argv[3] ||
    'https://example.com/';

  const endpoint =
    process.env.MCP_UNIFIED_BROWSER_PROOF_URL ||
    'http://127.0.0.1:3003/mcp';

  const token = (
    process.env.MCP_UNIFIED_BROWSER_PROOF_TOKEN ||
    ''
  ).trim();

  const client = new Client({
    name: 's22-unified-browser-proof',
    version: '1.0.0',
  });

  const transport =
    new StreamableHTTPClientTransport(
      new URL(endpoint),
      token
        ? {
            requestInit: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          }
        : undefined
    );

  let taskStarted = false;
  let taskFinished = false;

  try {
    await client.connect(transport);

    console.log(
      `PASS: connected to MCP HTTP: ${endpoint}`
    );

    if (token) {
      console.log(
        'PASS: MCP bearer authentication header is configured.'
      );
    }

    const listed = await client.listTools();

    const actualTools = listed.tools
      .map((tool) => tool.name)
      .sort();

    if (
      JSON.stringify(actualTools) !==
      JSON.stringify(EXPECTED_TOOLS)
    ) {
      throw new Error(
        `Expected exactly 8 tools.\nExpected: ${EXPECTED_TOOLS.join(', ')}\nActual: ${actualTools.join(', ')}`
      );
    }

    for (const legacyTool of LEGACY_TOOLS) {
      if (actualTools.includes(legacyTool)) {
        throw new Error(
          `Legacy tool is still exposed: ${legacyTool}`
        );
      }
    }

    console.log(
      'PASS: exactly 8 intended MCP HTTP tools are exposed.'
    );

    console.log(
      'PASS: all 15 legacy browser/login/auth tools are hidden.'
    );

    const before = await callJsonTool(
      client,
      'browser_task_status',
      { job }
    );

    console.log(
      `PASS: initial status returned state ${before.data.state}.`
    );

    taskStarted = true;

    const started = await callJsonTool(
      client,
      'browser_task_run',
      {
        job,
        action: 'start',
        objective:
          'Open Example Domain and inspect the page without entering data or performing a write action.',
        startUrl,
      },
      {
        requireImage: true,
      }
    );

    if (
      ![
        'running',
        'human_help_required',
      ].includes(started.data.state)
    ) {
      throw new Error(
        `Unexpected start state: ${started.data.state}`
      );
    }

    if (
      started.data?.browser?.page
        ?.httpStatus !== 200
    ) {
      throw new Error(
        `Expected HTTP 200, received ${started.data?.browser?.page?.httpStatus}`
      );
    }

    const startedAt =
      started.data?.task
        ?.browserSessionStartedAt;

    if (!startedAt) {
      throw new Error(
        'Start result did not include browserSessionStartedAt.'
      );
    }

    console.log(
      `PASS: browser task started with HTTP 200 and ${started.imageBytes} PNG bytes.`
    );

    const snapshot = await callJsonTool(
      client,
      'browser_task_run',
      {
        job,
        action: 'snapshot',
      },
      {
        requireImage: true,
      }
    );

    const snapshotStartedAt =
      snapshot.data?.task
        ?.browserSessionStartedAt;

    if (snapshotStartedAt !== startedAt) {
      throw new Error(
        'Persistent browser session changed between start and snapshot.'
      );
    }

    console.log(
      `PASS: snapshot used the same persistent browser session and returned ${snapshot.imageBytes} PNG bytes.`
    );

    const clarificationRequested =
      await callJsonTool(
        client,
        'browser_task_handoff',
        {
          job,
          action: 'request',
          type: 'clarification',
          reason: 'proof_clarification',
          message:
            'Confirm that the proof may resume without browser control.',
        }
      );

    if (
      clarificationRequested.data.state !==
      'user_choice_required'
    ) {
      throw new Error(
        `Expected user_choice_required after clarification request, received ${clarificationRequested.data.state}`
      );
    }

    const clarificationCompleted =
      await callJsonTool(
        client,
        'browser_task_handoff',
        {
          job,
          action: 'complete',
          type: 'clarification',
        }
      );

    if (
      clarificationCompleted.data.state !==
      'running'
    ) {
      throw new Error(
        `Expected running state after clarification completion, received ${clarificationCompleted.data.state}`
      );
    }

    if (
      clarificationCompleted.data?.task
        ?.browserSessionStartedAt !==
      startedAt
    ) {
      throw new Error(
        'Persistent browser session changed during clarification handoff.'
      );
    }

    console.log(
      'PASS: clarification handoff request and completion preserved the persistent browser session.'
    );

    const runningStatus =
      await callJsonTool(
        client,
        'browser_task_status',
        { job },
        {
          requireImage: true,
        }
      );

    if (
      runningStatus.data?.worker?.active !==
      true
    ) {
      throw new Error(
        'Status did not report an active persistent browser task.'
      );
    }

    if (
      runningStatus.data?.worker?.job !== job
    ) {
      throw new Error(
        'Status reported a different active browser job.'
      );
    }

    console.log(
      `PASS: browser_task_status reported the active job and returned ${runningStatus.imageBytes} PNG bytes.`
    );

    const completed = await callJsonTool(
      client,
      'browser_task_run',
      {
        job,
        action: 'complete',
      }
    );

    if (
      completed.data.state !== 'completed'
    ) {
      throw new Error(
        `Expected completed state, received ${completed.data.state}`
      );
    }

    taskFinished = true;

    console.log(
      'PASS: unified browser task completed.'
    );

    const finalStatus =
      await callJsonTool(
        client,
        'browser_task_status',
        { job }
      );

    if (
      finalStatus.data?.task?.state !==
      'completed'
    ) {
      throw new Error(
        `Saved task state is not completed: ${finalStatus.data?.task?.state}`
      );
    }

    if (
      finalStatus.data?.worker?.active ===
      true
    ) {
      throw new Error(
        'Persistent browser remained active after completion.'
      );
    }

    console.log(
      'PASS: final status shows completed task and inactive browser session.'
    );

    console.log(
      'PASS: unified MCP browser proof completed.'
    );

    console.log(
      'No credential, cookie, token, field value, storageState content, or public screenshot directory was used.'
    );
  } finally {
    if (
      taskStarted &&
      !taskFinished
    ) {
      await client
        .callTool({
          name: 'browser_task_run',
          arguments: {
            job,
            action: 'cancel',
          },
        })
        .catch(() => {});
    }

    await transport.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(
    `FAIL: ${error?.message || error}`
  );

  process.exitCode = 1;
});
