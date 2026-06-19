#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.JOB_RADAR_BASE_URL || 'http://127.0.0.1:3001';
const BROWSER_WORKER_URL = process.env.BROWSER_WORKER_URL || 'http://127.0.0.1:3002';

function toTextResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function toErrorResult(error) {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: error?.message || String(error),
      },
    ],
  };
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {},
  };

  if (options.body !== undefined) {
    fetchOptions.headers['content-type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get('content-type') || '';

  let body;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    throw new Error(
      `API error ${response.status} ${response.statusText}: ${
        typeof body === 'string' ? body : JSON.stringify(body)
      }`
    );
  }

  return body;
}

async function browserWorkerApi(path) {
  const response = await fetch(`${BROWSER_WORKER_URL}${path}`);

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Browser worker ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function safeTool(handler) {
  try {
    const data = await handler();
    return toTextResult(data);
  } catch (error) {
    return toErrorResult(error);
  }
}

const server = new McpServer({
  name: 's22-web-agent',
  version: '0.1.0',
});

server.tool(
  'job_radar_health',
  'Check whether the S22 Web Agent API is reachable.',
  {},
  {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  async () => safeTool(() => api('/health'))
);

server.tool(
  'job_radar_list_pages',
  'List job source pages stored in the S22 Web Agent.',
  {},
  {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  async () => safeTool(() => api('/pages'))
);

server.tool(
  'job_radar_get_page',
  'Get one job source page by ID.',
  {
    id: z.coerce.number().int().positive().describe('Page ID from GET /pages'),
  },
  {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  async ({ id }) => safeTool(() => api(`/pages/${id}`))
);

server.tool(
  'job_radar_scan',
  'Scan a webpage URL using the S22 Web Agent API and save the result into SQLite.',
  {
    url: z.string().min(1).describe('The URL to scan. Accepts example.com, www.example.com, http://, or https://.'),
  },
  {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: true,
  },
  async ({ url }) =>
    safeTool(() =>
      api('/scan', {
        method: 'POST',
        body: { url },
      })
    )
);

server.tool(
  'job_radar_get_report',
  'Generate a markdown scan report by saved page ID.',
  {
    id: z.coerce.number().int().positive().describe('Saved page ID from job_radar_list_pages'),
  },
  {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  async ({ id }) => safeTool(() => api(`/report/${id}`))
);

async function main() {
  server.tool(
    'browser_inspect_url',
    'Inspect a web page using the proot Playwright browser worker running on the S22.',
    {
      url: z.string().url().describe('The http or https URL to inspect with Chromium.'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ url }) =>
      safeTool(() => {
        const encodedUrl = encodeURIComponent(url);
        return browserWorkerApi(`/inspect?url=${encodedUrl}`);
      })
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
