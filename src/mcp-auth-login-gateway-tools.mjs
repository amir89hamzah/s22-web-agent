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
const TIMEOUT_MS = Number(process.env.AUTH_LOGIN_GATEWAY_MCP_TIMEOUT_MS || 180_000);
const MAX_BUFFER = Number(process.env.AUTH_LOGIN_GATEWAY_MCP_MAX_BUFFER || 1_000_000);
const EXPECTED_EXIT_CODES = new Set([0, 21, 23, 24]);

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

function sanitize(value) {
  return String(value || '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
    .replace(/\beyJ[A-Za-z0-9._-]{40,}\b/g, '[redacted-token]')
    .replace(/\b[A-Za-z0-9_-]{80,}\b/g, '[redacted-long-value]')
    .trim()
    .slice(0, 1000);
}

async function runGatewayAction(action, scriptName, args = []) {
  const scriptPath = path.join(REPO_ROOT, 'scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`login gateway wrapper not found: ${scriptPath}`);
  }

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    const result = await execFileAsync('bash', [scriptPath, ...args], {
      cwd: REPO_ROOT,
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
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

    if (!EXPECTED_EXIT_CODES.has(exitCode)) {
      throw new Error(`login gateway ${action} failed: ${sanitize(stderr) || `exit code ${exitCode}`}`);
    }
  }

  let parsed = null;
  try {
    parsed = stdout.trim() ? JSON.parse(stdout) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return {
      ok: false,
      state: 'runtime_error',
      gatewayAction: action,
      gatewayExitCode: exitCode,
      message: sanitize(stderr) || 'Login gateway helper returned no JSON result.',
      mcpSafety:
        'No credential, Cloudflare token, MCP token, storageState JSON, or full user prompt was accepted or printed.',
    };
  }

  return {
    ...parsed,
    gatewayAction: action,
    gatewayExitCode: exitCode,
    mcpSafety:
      'The tool accepts only a task job name, explicit approval or completion confirmation, and optional non-secret authenticated probe details. It never accepts a credential, Cloudflare token, MCP token, storageState JSON, or full user prompt.',
  };
}

export function registerAuthenticatedLoginGatewayTools(server) {
  server.tool(
    'browser_authenticated_login_gateway_start',
    'Start the temporary VNC/noVNC login path for an authenticated task only after the user explicitly approves it. The protected shared Cloudflare connector must already be running. This tool never accepts or starts a tunnel token and never asks for website credentials.',
    {
      job: z.string().regex(SAFE_NAME_RE).describe('Authenticated task job in login_required state.'),
      approved: z
        .literal(true)
        .describe('Must be true only after the user explicitly approves opening the temporary protected login gateway.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ job, approved }) =>
      safeTool(() =>
        runGatewayAction('start', 'auth-login-gateway-start.sh', [job, approved ? 'approved' : ''])
      )
  );

  server.tool(
    'browser_authenticated_login_gateway_status',
    'Read the authenticated task login-gateway state and safe runtime observations. It does not print process command lines, tokens, credentials, or storageState content.',
    {
      job: z.string().regex(SAFE_NAME_RE).describe('Authenticated task job identifier.'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ job }) =>
      safeTool(() => runGatewayAction('status', 'auth-login-gateway-status.sh', [job]))
  );

  server.tool(
    'browser_authenticated_login_gateway_complete',
    'Complete a user-approved manual login after the user confirms login succeeded. Saves the profile locally, stops noVNC and VNC, and re-checks the authenticated task. For a newly onboarded site, authenticatedTargetUrl and expectedText may be supplied together to replace the provisional probe target with the real authenticated page and a non-secret marker. The shared MCP tunnel remains running.',
    {
      job: z.string().regex(SAFE_NAME_RE).describe('Authenticated task job waiting for user login.'),
      userConfirmedLoginComplete: z
        .literal(true)
        .describe('Must be true only after the user confirms the website login is complete in noVNC.'),
      authenticatedTargetUrl: z
        .string()
        .url()
        .optional()
        .describe('Optional real authenticated http or https page observed after login. Provide together with expectedText.'),
      expectedText: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe('Optional non-secret marker expected only on the authenticated page. Provide together with authenticatedTargetUrl.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async ({ job, userConfirmedLoginComplete, authenticatedTargetUrl, expectedText }) =>
      safeTool(() =>
        runGatewayAction('complete', 'auth-login-gateway-complete.sh', [
          job,
          userConfirmedLoginComplete ? 'confirmed' : '',
          authenticatedTargetUrl || '',
          expectedText || '',
        ])
      )
  );

  server.tool(
    'browser_authenticated_login_gateway_cancel',
    'Cancel the temporary manual-login path, stop noVNC and VNC, and cancel the authenticated task. The shared MCP tunnel is deliberately left running.',
    {
      job: z.string().regex(SAFE_NAME_RE).describe('Authenticated task job identifier.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ job }) =>
      safeTool(() => runGatewayAction('cancel', 'auth-login-gateway-cancel.sh', [job]))
  );

  return server;
}
