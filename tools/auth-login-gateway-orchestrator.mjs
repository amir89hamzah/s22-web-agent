#!/usr/bin/env node

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const REPO = process.env.SESSION_REPO_ROOT || process.cwd();
const TASK_DIR = path.join(REPO, '.runtime', 'authenticated-tasks');
const MANUAL_DIR = path.join(REPO, '.runtime', 'manual-login-jobs');
const PUBLIC_HOST = process.env.AUTH_GATEWAY_PUBLIC_HOST || 's22login.aidesk.rest';
const MAX_BUFFER = Number(process.env.AUTH_GATEWAY_MAX_BUFFER || 1_000_000);
const START_TIMEOUT_MS = Number(process.env.AUTH_GATEWAY_START_TIMEOUT_MS || 120_000);
const COMPLETE_TIMEOUT_MS = Number(process.env.AUTH_GATEWAY_COMPLETE_TIMEOUT_MS || 120_000);
const STATUS_TIMEOUT_MS = Number(process.env.AUTH_GATEWAY_STATUS_TIMEOUT_MS || 10_000);

const EXIT = Object.freeze({
  OK: 0,
  APPROVAL_REQUIRED: 21,
  UNSAFE: 23,
  CANCELLED: 24,
});

function usage() {
  console.error(`Usage:
  node tools/auth-login-gateway-orchestrator.mjs start <job> approved
  node tools/auth-login-gateway-orchestrator.mjs status <job>
  node tools/auth-login-gateway-orchestrator.mjs complete <job> confirmed
  node tools/auth-login-gateway-orchestrator.mjs cancel <job>`);
}

function assertSafeName(value, label) {
  if (!SAFE_NAME_RE.test(String(value || ''))) {
    throw new Error(`${label} invalid. Use letters, numbers, dot, underscore, or dash; max 64 characters.`);
  }
}

function taskPath(job) {
  return path.join(TASK_DIR, `${job}.json`);
}

async function readJson(filePath, missingMessage) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(missingMessage);
    }
    throw new Error(`runtime metadata could not be read: ${error?.message || error}`);
  }
}

async function readTask(job) {
  assertSafeName(job, 'job');
  return readJson(taskPath(job), `authenticated task job not found: ${job}`);
}

async function writeTask(task) {
  await fs.mkdir(TASK_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(taskPath(task.job), `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
}

function safeUrl(raw, keepSafeNoVncQuery = false) {
  try {
    const url = new URL(String(raw || ''));
    url.username = '';
    url.password = '';
    if (!keepSafeNoVncQuery) {
      url.search = '';
      url.hash = '';
    }
    return url.href;
  } catch {
    return '(invalid URL)';
  }
}

function redact(value) {
  return String(value || '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => safeUrl(candidate))
    .replace(/\beyJ[A-Za-z0-9._-]{40,}\b/g, '[redacted-token]')
    .replace(/\b[A-Za-z0-9_-]{80,}\b/g, '[redacted-long-value]')
    .trim()
    .slice(0, 1000);
}

function gatewayUrl() {
  const url = new URL(`https://${PUBLIC_HOST}/vnc.html`);
  url.searchParams.set('host', PUBLIC_HOST);
  url.searchParams.set('port', '443');
  url.searchParams.set('autoconnect', '1');
  url.searchParams.set('resize', 'scale');
  return url.href;
}

async function processExists(pattern) {
  try {
    await execFileAsync('pgrep', ['-f', pattern], {
      timeout: STATUS_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
    });
    return true;
  } catch {
    return false;
  }
}

async function localNoVncReachable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch('http://127.0.0.1:6080/', {
      signal: controller.signal,
      redirect: 'manual',
    });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function accessChallengeDetected() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`https://${PUBLIC_HOST}/`, {
      signal: controller.signal,
      redirect: 'manual',
    });
    const location = response.headers.get('location') || '';
    return {
      detected:
        [301, 302, 303, 307, 308].includes(response.status) &&
        /cloudflareaccess\.com|\/cdn-cgi\/access\/login/i.test(location),
      status: response.status,
    };
  } catch {
    return { detected: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function runScript(scriptName, args = [], options = {}) {
  const scriptPath = path.join(REPO, 'scripts', scriptName);
  try {
    return await execFileAsync('bash', [scriptPath, ...args], {
      cwd: REPO,
      timeout: options.timeout || START_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      env: { ...process.env, ...(options.env || {}) },
    });
  } catch (error) {
    const code = Number.isInteger(error?.code) ? error.code : EXIT.UNSAFE;
    throw new Error(`${options.label || scriptName} failed with exit code ${code}. ${redact(error?.stderr || error?.message)}`);
  }
}

async function runLifecycleResume(job) {
  const scriptPath = path.join(REPO, 'scripts', 'auth-task-resume.sh');
  let stdout = '';
  let exitCode = 0;
  try {
    const result = await execFileAsync('bash', [scriptPath, job], {
      cwd: REPO,
      timeout: COMPLETE_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      env: { ...process.env, SESSION_SCAN_SUPPRESS_EXCERPT: '1' },
    });
    stdout = result.stdout;
  } catch (error) {
    exitCode = Number.isInteger(error?.code) ? error.code : EXIT.UNSAFE;
    stdout = String(error?.stdout || '');
    if (![21, 22, 23, 24].includes(exitCode)) {
      throw new Error(`authenticated task resume failed with exit code ${exitCode}.`);
    }
  }

  try {
    return { exitCode, result: JSON.parse(stdout) };
  } catch {
    throw new Error('authenticated task resume returned an unreadable result.');
  }
}

async function readManualStatus(profile) {
  try {
    const manual = await readJson(
      path.join(MANUAL_DIR, `${profile}.json`),
      `manual login job not found for profile: ${profile}`
    );
    return {
      status: String(manual.status || 'unknown'),
      startedAt: manual.startedAt || null,
      completedAt: manual.completedAt || null,
      updatedAt: manual.updatedAt || null,
    };
  } catch {
    return { status: 'not_found', startedAt: null, completedAt: null, updatedAt: null };
  }
}

async function observedRuntime(task) {
  const [sharedConnectorRunning, noVncReachable, vncRunning, manualLogin] = await Promise.all([
    processExists('[c]loudflared'),
    localNoVncReachable(),
    processExists('[X]tigervnc|[X]vnc|[t]igervnc'),
    readManualStatus(task.profile),
  ]);

  return {
    sharedConnectorRunning,
    noVncReachable,
    vncRunning,
    manualLogin,
  };
}

function publicView(task, runtime = null) {
  const active = Boolean(task.publicGatewayStarted);
  return {
    ok: task.state === 'ready' || task.state === 'waiting_for_user_login',
    job: task.job,
    profile: task.profile,
    state: task.state,
    targetUrl: safeUrl(task.targetUrl),
    loginUrl: task.loginUrl ? safeUrl(task.loginUrl) : null,
    approvalRequired: Boolean(task.approvalRequired),
    approvalRecorded: Boolean(task.approvalRecorded),
    publicGatewayStarted: active,
    gatewayUrl: active ? gatewayUrl() : null,
    sharedTunnelStartedByThisHelper: false,
    runtime,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    next: task.next,
    safety:
      'The shared Cloudflare tunnel token is never accepted or printed. This helper starts only the local VNC/noVNC login path after explicit approval; the existing shared connector must already be running.',
  };
}

async function start(args) {
  const [job, approval] = args;
  if (!job || approval !== 'approved') {
    usage();
    process.exitCode = EXIT.APPROVAL_REQUIRED;
    return;
  }

  const task = await readTask(job);
  if (task.state !== 'login_required' || task.approvalRequired !== true) {
    throw new Error(`gateway start blocked: task state is ${task.state}; expected login_required with approvalRequired=true.`);
  }
  if (!task.loginUrl) {
    throw new Error('gateway start blocked: task has no login URL.');
  }

  const connectorRunning = await processExists('[c]loudflared');
  if (!connectorRunning) {
    throw new Error('gateway start blocked: shared cloudflared connector is not running. Start protected Route A first.');
  }

  const access = await accessChallengeDetected();
  if (!access.detected) {
    throw new Error(`gateway start blocked: Cloudflare Access challenge was not detected for the login hostname (HTTP ${access.status}).`);
  }

  try {
    await runScript('session-manual-login-novnc-local-start.sh', [task.profile, task.loginUrl], {
      timeout: START_TIMEOUT_MS,
      label: 'local VNC/noVNC manual login start',
    });
  } catch (error) {
    try {
      await runScript('session-manual-login-novnc-local-cancel.sh', [task.profile], {
        timeout: 60_000,
        env: {
          SESSION_NOVNC_STOP_AFTER_CANCEL: '1',
          SESSION_VNC_STOP_AFTER_CANCEL: '1',
        },
        label: 'partial gateway cleanup',
      });
    } catch {
      // Keep the original error; operator can run the cancel helper locally.
    }
    throw error;
  }

  if (!(await localNoVncReachable())) {
    throw new Error('gateway start failed: local noVNC did not become reachable on 127.0.0.1:6080.');
  }

  task.state = 'waiting_for_user_login';
  task.approvalRequired = false;
  task.approvalRecorded = true;
  task.approvalRecordedAt = new Date().toISOString();
  task.publicGatewayStarted = true;
  task.gatewayHost = PUBLIC_HOST;
  task.gatewayStartedAt = new Date().toISOString();
  task.updatedAt = task.gatewayStartedAt;
  task.next = 'Give the protected gateway URL to the user. After the user confirms login is complete, call the gateway complete action. Do not ask for credentials.';
  await writeTask(task);

  console.log(JSON.stringify(publicView(task, await observedRuntime(task)), null, 2));
}

async function status(args) {
  const [job] = args;
  if (!job) {
    usage();
    process.exitCode = EXIT.UNSAFE;
    return;
  }
  const task = await readTask(job);
  console.log(JSON.stringify(publicView(task, await observedRuntime(task)), null, 2));
}

async function complete(args) {
  const [job, confirmation] = args;
  if (!job || confirmation !== 'confirmed') {
    usage();
    process.exitCode = EXIT.APPROVAL_REQUIRED;
    return;
  }

  let task = await readTask(job);
  if (task.state !== 'waiting_for_user_login' || task.publicGatewayStarted !== true) {
    throw new Error(`gateway complete blocked: task state is ${task.state}; expected waiting_for_user_login with an active gateway.`);
  }

  await runScript('session-manual-login-novnc-local-complete.sh', [task.profile], {
    timeout: COMPLETE_TIMEOUT_MS,
    env: {
      SESSION_NOVNC_STOP_AFTER_COMPLETE: '1',
      SESSION_VNC_STOP_AFTER_COMPLETE: '1',
      SESSION_SCAN_SUPPRESS_EXCERPT: '1',
    },
    label: 'manual login completion and profile capture',
  });

  const resumed = await runLifecycleResume(job);
  task = await readTask(job);
  task.publicGatewayStarted = false;
  task.gatewayCompletedAt = new Date().toISOString();
  task.updatedAt = task.gatewayCompletedAt;
  task.gatewayLastResumeExitCode = resumed.exitCode;
  await writeTask(task);

  console.log(JSON.stringify(publicView(task, await observedRuntime(task)), null, 2));
  process.exitCode = task.state === 'ready' ? EXIT.OK : EXIT.APPROVAL_REQUIRED;
}

async function cancel(args) {
  const [job] = args;
  if (!job) {
    usage();
    process.exitCode = EXIT.UNSAFE;
    return;
  }

  const task = await readTask(job);
  await runScript('session-manual-login-novnc-local-cancel.sh', [task.profile], {
    timeout: 60_000,
    env: {
      SESSION_NOVNC_STOP_AFTER_CANCEL: '1',
      SESSION_VNC_STOP_AFTER_CANCEL: '1',
    },
    label: 'login gateway cancel',
  });

  task.state = 'cancelled';
  task.approvalRequired = false;
  task.publicGatewayStarted = false;
  task.gatewayCancelledAt = new Date().toISOString();
  task.updatedAt = task.gatewayCancelledAt;
  task.next = 'The login gateway and authenticated task were cancelled. The shared MCP tunnel was not stopped.';
  await writeTask(task);

  console.log(JSON.stringify(publicView(task, await observedRuntime(task)), null, 2));
  process.exitCode = EXIT.CANCELLED;
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!['start', 'status', 'complete', 'cancel'].includes(action)) {
    usage();
    process.exitCode = EXIT.UNSAFE;
    return;
  }
  await ({ start, status, complete, cancel })[action](args);
}

main().catch((error) => {
  console.error('state: runtime_error');
  console.error(`message: ${redact(error?.message || error)}`);
  console.error('The shared tunnel token was not accepted or printed.');
  process.exitCode = EXIT.UNSAFE;
});
