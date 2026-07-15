import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const { savePageScan, dbPath } = require('./db');
const { classifyPage } = require('./classifier');
const { normalizeUrl } = require('./scanner');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.JOB_RADAR_BASE_URL || 'http://127.0.0.1:3001';
const BROWSER_WORKER_URL = process.env.BROWSER_WORKER_URL || 'http://127.0.0.1:3002';
const execFileAsync = promisify(execFile);
const SAFE_PROFILE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const PROFILE_SCAN_TIMEOUT_MS = Number(process.env.PROFILE_SCAN_TIMEOUT_MS || 60_000);
const PROFILE_SCAN_MAX_BUFFER = Number(process.env.PROFILE_SCAN_MAX_BUFFER || 1_000_000);


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

async function runProfileAwareScan({ profile, url, expectedText = '' }) {
  const safeProfile = String(profile || '').trim();
  const safeUrl = String(url || '').trim();
  const safeExpectedText = String(expectedText || '');

  if (!SAFE_PROFILE_RE.test(safeProfile)) {
    throw new Error(
      'profile invalid. Use only letters, numbers, dot, underscore, and dash; max 64 chars; first char must be alphanumeric.'
    );
  }

  if (!safeUrl) {
    throw new Error('url is required.');
  }

  const scriptPath = path.join(__dirname, '..', 'scripts', 'session-profile-scan.sh');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`profile scan wrapper not found: ${scriptPath}`);
  }

  const args = [scriptPath, safeProfile, safeUrl];

  if (safeExpectedText) {
    args.push(safeExpectedText);
  }

  try {
    const { stdout, stderr } = await execFileAsync('bash', args, {
      cwd: path.join(__dirname, '..'),
      timeout: PROFILE_SCAN_TIMEOUT_MS,
      maxBuffer: PROFILE_SCAN_MAX_BUFFER,
      env: {
        ...process.env,
        SESSION_SCAN_SUPPRESS_EXCERPT: process.env.SESSION_SCAN_SUPPRESS_EXCERPT || '1',
      },
    });

    return {
      ok: true,
      profile: safeProfile,
      url: safeUrl,
      expectedTextProvided: Boolean(safeExpectedText),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      safety:
        'MCP accepted only a named profile and URL. Cookies, tokens, passwords, and storageState JSON were not printed.',
    };
  } catch (error) {
    return {
      ok: false,
      profile: safeProfile,
      url: safeUrl,
      expectedTextProvided: Boolean(safeExpectedText),
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || '').trim(),
      error: error?.message || String(error),
      safety:
        'Failure output is limited to helper stdout/stderr. Cookies, tokens, passwords, and storageState JSON must not be printed.',
    };
  }
}



async function runManualLoginScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, '..', 'scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`manual login wrapper not found: ${scriptPath}`);
  }
  const { stdout, stderr } = await execFileAsync('bash', [scriptPath, ...args], {
    cwd: path.join(__dirname, '..'),
    timeout: Number(process.env.MANUAL_LOGIN_MCP_TIMEOUT_MS || 90_000),
    maxBuffer: Number(process.env.MANUAL_LOGIN_MCP_MAX_BUFFER || 1_000_000),
    env: { ...process.env },
  });
  return {
    ok: true,
    command: scriptName,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    safety: 'MCP accepted only profile and URL where applicable. Passwords, cookies, tokens, and storageState JSON were not accepted or printed.',
  };
}

export function createS22McpServer({ includeLegacyBrowserTools = true } = {}) {
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

  if (!includeLegacyBrowserTools) {
    return server;
  }

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


  server.tool(
    'browser_scan_with_profile',
    'Scan an authenticated page using a named local session profile captured on the S22. The tool never accepts a storageState path and never prints cookies or session values.',
    {
      profile: z
        .string()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/)
        .describe('Named local session profile, for example local-login-demo. Do not provide a path.'),
      url: z
        .string()
        .min(1)
        .describe('Target http or https URL. Host must match the profile metadata allowlist.'),
      expectedText: z
        .string()
        .max(500)
        .optional()
        .describe('Optional non-secret text expected in the page body.'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ profile, url, expectedText }) =>
      safeTool(() =>
        runProfileAwareScan({
          profile,
          url,
          expectedText,
        })
      )
  );

  
  server.tool(
    'browser_start_manual_login',
    'Start a pending manual login job for a named local profile. User completes login through local aVNC/noVNC; no password, cookie, token, or storageState is accepted by MCP.',
    {
      profile: z
        .string()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/)
        .describe('Named local session profile, for example github-login-demo. Do not provide a path or secret.'),
      url: z
        .string()
        .min(1)
        .describe('Login or landing URL to open manually in local browser. Use only an account you own.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ profile, url }) => safeTool(() =>
      runManualLoginScript('session-manual-login-start.sh', [profile, url])
    )
  );

  server.tool(
    'browser_manual_login_status',
    'Check pending manual login job status for a named local profile. Does not print cookies, tokens, passwords, or storageState JSON.',
    {
      profile: z
        .string()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/)
        .describe('Named local session profile, for example github-login-demo.'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ profile }) => safeTool(() =>
      runManualLoginScript('session-manual-login-status.sh', [profile])
    )
  );

  server.tool(
    'browser_complete_manual_login',
    'Mark a pending manual login job as completed after the user confirms login succeeded in local aVNC/noVNC. Saves storageState locally only.',
    {
      profile: z
        .string()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/)
        .describe('Named local session profile to complete.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ profile }) => safeTool(() =>
      runManualLoginScript('session-manual-login-complete.sh', [profile])
    )
  );

  server.tool(
    'browser_cancel_manual_login',
    'Cancel a pending manual login job for a named local profile.',
    {
      profile: z
        .string()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/)
        .describe('Named local session profile to cancel.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ profile }) => safeTool(() =>
      runManualLoginScript('session-manual-login-cancel.sh', [profile])
    )
  );

  return server;
}
