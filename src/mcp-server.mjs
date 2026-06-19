#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const { savePageScan, dbPath } = require('./db');
const { classifyPage } = require('./classifier');
const { normalizeUrl } = require('./scanner');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function normalizeBrowserHeadings(data) {
  if (Array.isArray(data.headings)) {
    return data.headings
      .map((heading) => String(heading || '').trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  if (data.h1) {
    return [String(data.h1).trim()].filter(Boolean);
  }

  return [];
}

function normalizeBrowserLinks(data) {
  if (!Array.isArray(data.links)) {
    return [];
  }

  return data.links
    .map((link) => {
      if (typeof link === 'string') {
        return {
          text: link,
          href: link,
        };
      }

      return {
        text: String(link.text || link.title || link.href || '').trim(),
        href: String(link.href || link.url || '').trim(),
      };
    })
    .filter((link) => link.text && link.href)
    .slice(0, 15);
}

function truncateText(value, maxLength = 1000) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function buildBrowserScanResult(url, data) {
  const parsedUrl = normalizeUrl(url);

  const result = {
    scanned_at: new Date().toISOString(),
    url: data.url || parsedUrl.toString(),
    title: data.title || '',
    description: data.description || truncateText(data.textSample || ''),
    headings: normalizeBrowserHeadings(data),
    links: normalizeBrowserLinks(data),
  };

  const classification = classifyPage(result);

  result.category = classification.category;
  result.relevance_score = classification.relevance_score;
  result.notes = classification.notes;

  return result;
}

async function inspectAndSaveBrowserUrl(url) {
  const parsedUrl = normalizeUrl(url);
  const normalizedUrl = parsedUrl.toString();
  const encodedUrl = encodeURIComponent(normalizedUrl);
  const inspection = await browserWorkerApi(`/inspect?url=${encodedUrl}`);

  const result = buildBrowserScanResult(normalizedUrl, inspection);
  const pageId = savePageScan(result);

  const reportsDir = path.join(__dirname, '..', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const outputPath = path.join(reportsDir, 'last-browser-scan.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        result,
        pageId,
        inspection,
      },
      null,
      2
    )
  );

  return {
    ok: true,
    saved: true,
    pageId,
    result,
    outputPath,
    dbPath,
  };
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

  server.tool(
    'browser_scan_url',
    'Inspect a web page using the proot Playwright browser worker, classify it, and save the result into SQLite.',
    {
      url: z.string().min(1).describe('The URL to inspect and save. Accepts example.com, http://, or https://.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ url }) => safeTool(() => inspectAndSaveBrowserUrl(url))
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
