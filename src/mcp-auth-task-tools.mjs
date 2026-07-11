import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..');
const SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const AUTH_TASK_MCP_TIMEOUT_MS = Number(process.env.AUTH_TASK_MCP_TIMEOUT_MS || 120_000);
const AUTH_TASK_MCP_MAX_BUFFER = Number(process.env.AUTH_TASK_MCP_MAX_BUFFER || 1_000_000);
const LIFECYCLE_EXIT_CODES = new Set([0, 21, 22, 23, 24]);

function toTextResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
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

async function safeTool(handler) {
  try {
    return toTextResult(await handler());
  } catch (error) {
    return toErrorResult(error);
  }
}

function sanitizeDiagnostic(value) {
  return String(value || '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => {
      try {
        const url = new URL(candidate);
        url.username = '';
        url.password = '';
        url.search = '';
        url.hash = '';
        return url.href;
      } catch {
        return '[url]';
      }
    })
    .trim()
    .slice(0, 2000);
}

function parseLifecycleJson(stdout) {
  const text = String(stdout || '').trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function runAuthenticatedTaskAction(action, scriptName, args = []) {
  const scriptPath = path.join(REPO_ROOT, 'scripts', scriptName);

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`authenticated task wrapper not found: ${scriptPath}`);
  }

  let exitCode = 0;
  let stdout = '';
  let stderr = '';

  try {
    const result = await execFileAsync('bash', [scriptPath, ...args], {
      cwd: REPO_ROOT,
      timeout: AUTH_TASK_MCP_TIMEOUT_MS,
      maxBuffer: AUTH_TASK_MCP_MAX_BUFFER,
      env: {
        ...process.env,
        SESSION_SCAN_SUPPRESS_EXCERPT: '1',
      },
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    exitCode = Number.isInteger(error?.code) ? error.code : 23;
    stdout = String(error?.stdout || '');
    stderr = String(error?.stderr || error?.message || '');

    if (!LIFECYCLE_EXIT_CODES.has(exitCode)) {
      throw new Error(
        `authenticated task ${action} failed: ${sanitizeDiagnostic(stderr) || `exit code ${exitCode}`}`
      );
    }
  }

  const parsed = parseLifecycleJson(stdout);

  if (parsed) {
    return {
      ...parsed,
      mcpAction: action,
      lifecycleExitCode: exitCode,
      publicGatewayStarted: false,
      mcpSafety:
        'This MCP tool did not accept credentials, storageState JSON, a Cloudflare token, or a full user prompt. It did not start VNC, noVNC, Cloudflare, or a public route.',
    };
  }

  return {
    ok: false,
    state: 'runtime_error',
    mcpAction: action,
    lifecycleExitCode: exitCode,
    publicGatewayStarted: false,
    message: sanitizeDiagnostic(stderr) || 'Authenticated task helper returned no JSON result.',
    mcpSafety:
      'This MCP tool did not accept credentials, storageState JSON, a Cloudflare token, or a full user prompt. It did not start VNC, noVNC, Cloudflare, or a public route.',
  };
}

export function registerAuthenticatedTaskTools(server) {
  server.tool(
    'browser_authenticated_task_prepare',
    'Prepare an authenticated browser task using a named S22 session profile. A valid profile returns ready. A missing or expired profile returns login_required and requires explicit user approval before any later public login gateway step. This tool never starts VNC, noVNC, Cloudflare, or a public route.',
    {
      job: z
        .string()
        .regex(SAFE_NAME_RE)
        .describe('Safe task identifier using letters, numbers, dot, underscore, or dash; max 64 characters.'),
      profile: z
        .string()
        .regex(SAFE_NAME_RE)
        .describe('Named local S22 session profile. Do not provide a path or secret.'),
      targetUrl: z
        .string()
        .url()
        .describe('Authenticated http or https page used to verify the saved profile.'),
      expectedText: z
        .string()
        .min(1)
        .max(500)
        .describe('Non-secret authenticated marker expected on the target page.'),
      loginUrl: z
        .string()
        .url()
        .optional()
        .describe('Optional login URL retained only as task metadata for a future user-approved login flow.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ job, profile, targetUrl, expectedText, loginUrl }) =>
      safeTool(() => {
        const args = [job, profile, targetUrl, expectedText];
        if (loginUrl) {
          args.push(loginUrl);
        }
        return runAuthenticatedTaskAction('prepare', 'auth-task-prepare.sh', args);
      })
  );

  server.tool(
    'browser_authenticated_task_status',
    'Read the saved lifecycle state of an authenticated browser task. This is a local metadata read and does not launch Chromium or start any gateway.',
    {
      job: z.string().regex(SAFE_NAME_RE).describe('Authenticated task identifier returned by prepare.'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ job }) =>
      safeTool(() => runAuthenticatedTaskAction('status', 'auth-task-status.sh', [job]))
  );

  server.tool(
    'browser_authenticated_task_resume',
    'Re-check the saved profile for an authenticated browser task after a delay or future manual login refresh. This launches a headless profile probe but never starts VNC, noVNC, Cloudflare, or a public route.',
    {
      job: z.string().regex(SAFE_NAME_RE).describe('Authenticated task identifier returned by prepare.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ job }) =>
      safeTool(() => runAuthenticatedTaskAction('resume', 'auth-task-resume.sh', [job]))
  );

  server.tool(
    'browser_authenticated_task_cancel',
    'Cancel the saved authenticated-task lifecycle metadata. This does not start or stop unrelated VNC, noVNC, Cloudflare, or browser services.',
    {
      job: z.string().regex(SAFE_NAME_RE).describe('Authenticated task identifier returned by prepare.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ job }) =>
      safeTool(() => runAuthenticatedTaskAction('cancel', 'auth-task-cancel.sh', [job]))
  );

  return server;
}
