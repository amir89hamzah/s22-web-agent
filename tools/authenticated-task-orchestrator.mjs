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
const MAX_BUFFER = Number(process.env.AUTH_TASK_MAX_BUFFER || 1_000_000);
const PROBE_TIMEOUT_MS = Number(process.env.AUTH_TASK_PROBE_TIMEOUT_MS || 90_000);

const EXIT = Object.freeze({
  OK: 0,
  LOGIN_REQUIRED: 21,
  DOMAIN_MISMATCH: 22,
  RUNTIME_ERROR: 23,
  CANCELLED: 24,
});

function usage() {
  console.error(`Usage:
  node tools/authenticated-task-orchestrator.mjs prepare <job> <profile> <target-url> <expected-text> [login-url]
  node tools/authenticated-task-orchestrator.mjs status <job>
  node tools/authenticated-task-orchestrator.mjs resume <job>
  node tools/authenticated-task-orchestrator.mjs cancel <job>`);
}

function assertSafeName(value, label) {
  if (!SAFE_NAME_RE.test(String(value || ''))) {
    throw new Error(`${label} invalid. Use letters, numbers, dot, underscore, or dash; max 64 characters.`);
  }
}

function parseHttpUrl(raw, label) {
  let url;
  try {
    url = new URL(String(raw || ''));
  } catch {
    throw new Error(`${label} is invalid.`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${label} must use http or https.`);
  }
  if (url.username || url.password) {
    throw new Error(`${label} must not contain embedded credentials.`);
  }
  return url;
}

function safeUrl(raw) {
  try {
    const url = new URL(raw);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '(invalid URL)';
  }
}

function taskPath(job) {
  return path.join(TASK_DIR, `${job}.json`);
}

async function writeTask(task) {
  await fs.mkdir(TASK_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(taskPath(task.job), `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
}

async function readTask(job) {
  assertSafeName(job, 'job');
  try {
    return JSON.parse(await fs.readFile(taskPath(job), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`authenticated task job not found: ${job}`);
    throw new Error(`authenticated task job could not be read: ${error?.message || error}`);
  }
}

function sanitizeOutput(value) {
  return String(value || '')
    .replace(/https?:\/\/[^\s)"']+/gi, (candidate) => safeUrl(candidate))
    .replace(/\s+$/g, '')
    .slice(0, 5000);
}

async function runProbe(profile, targetUrl, expectedText) {
  try {
    const { stdout, stderr } = await execFileAsync(
      'bash',
      [path.join(REPO, 'scripts', 'session-profile-probe.sh'), profile, targetUrl, expectedText],
      {
        cwd: REPO,
        timeout: PROBE_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
        env: { ...process.env, SESSION_SCAN_SUPPRESS_EXCERPT: '1' },
      }
    );
    return { code: 0, stdout: sanitizeOutput(stdout), stderr: sanitizeOutput(stderr) };
  } catch (error) {
    return {
      code: Number.isInteger(error?.code) ? error.code : EXIT.RUNTIME_ERROR,
      stdout: sanitizeOutput(error?.stdout),
      stderr: sanitizeOutput(error?.stderr || error?.message),
    };
  }
}

function stateFromProbeCode(code) {
  if (code === 0) return 'ready';
  if (code === 20 || code === 21) return 'login_required';
  if (code === 22) return 'domain_mismatch';
  return 'runtime_error';
}

function publicView(task) {
  return {
    ok: task.state === 'ready',
    job: task.job,
    profile: task.profile,
    state: task.state,
    targetUrl: safeUrl(task.targetUrl),
    loginUrl: task.loginUrl ? safeUrl(task.loginUrl) : null,
    approvalRequired: task.approvalRequired,
    publicGatewayStarted: false,
    resumable: ['login_required', 'ready'].includes(task.state),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    probeSummary: task.probeSummary,
    next: task.next,
    safety:
      'No password, cookie, token, MFA code, storageState JSON, or full user prompt is stored or printed. Public noVNC was not started.',
  };
}

async function evaluate(task) {
  const probe = await runProbe(task.profile, task.targetUrl, task.expectedText);
  const state = stateFromProbeCode(probe.code);
  const now = new Date().toISOString();

  task.state = state;
  task.updatedAt = now;
  task.probeSummary = {
    exitCode: probe.code,
    stdout: probe.stdout,
    stderr: probe.stderr,
  };
  task.approvalRequired = state === 'login_required';

  if (state === 'ready') {
    task.next = 'The authenticated profile is valid. The caller may continue the requested browser task using this profile.';
  } else if (state === 'login_required') {
    task.next =
      'Ask the user for explicit approval before starting any temporary login gateway. After human login and profile capture, run resume for this job.';
  } else if (state === 'domain_mismatch') {
    task.next = 'Use a profile captured for the target domain. Do not start a login gateway for the wrong profile/domain pair.';
  } else {
    task.next = 'Resolve the local runtime or network error, then run resume. Do not start a public login gateway automatically.';
  }

  await writeTask(task);
  return task;
}

async function prepare(args) {
  const [job, profile, rawTargetUrl, expectedText, rawLoginUrl = ''] = args;
  if (!job || !profile || !rawTargetUrl || !expectedText) {
    usage();
    process.exitCode = EXIT.RUNTIME_ERROR;
    return;
  }

  assertSafeName(job, 'job');
  assertSafeName(profile, 'profile');
  const targetUrl = parseHttpUrl(rawTargetUrl, 'target URL');
  const loginUrl = rawLoginUrl ? parseHttpUrl(rawLoginUrl, 'login URL') : null;

  const now = new Date().toISOString();
  const task = {
    schemaVersion: 1,
    job,
    profile,
    targetUrl: targetUrl.href,
    expectedText: String(expectedText).slice(0, 500),
    loginUrl: loginUrl?.href || '',
    state: 'checking_profile',
    approvalRequired: false,
    publicGatewayStarted: false,
    createdAt: now,
    updatedAt: now,
    probeSummary: null,
    next: 'Checking saved authenticated profile.',
  };

  await writeTask(task);
  const evaluated = await evaluate(task);
  console.log(JSON.stringify(publicView(evaluated), null, 2));
  process.exitCode = evaluated.state === 'ready' ? EXIT.OK : evaluated.state === 'login_required' ? EXIT.LOGIN_REQUIRED : evaluated.state === 'domain_mismatch' ? EXIT.DOMAIN_MISMATCH : EXIT.RUNTIME_ERROR;
}

async function status(args) {
  const [job] = args;
  if (!job) {
    usage();
    process.exitCode = EXIT.RUNTIME_ERROR;
    return;
  }
  const task = await readTask(job);
  console.log(JSON.stringify(publicView(task), null, 2));
}

async function resume(args) {
  const [job] = args;
  if (!job) {
    usage();
    process.exitCode = EXIT.RUNTIME_ERROR;
    return;
  }
  const task = await readTask(job);
  if (task.state === 'cancelled') {
    console.log(JSON.stringify(publicView(task), null, 2));
    process.exitCode = EXIT.CANCELLED;
    return;
  }
  const evaluated = await evaluate(task);
  console.log(JSON.stringify(publicView(evaluated), null, 2));
  process.exitCode = evaluated.state === 'ready' ? EXIT.OK : evaluated.state === 'login_required' ? EXIT.LOGIN_REQUIRED : evaluated.state === 'domain_mismatch' ? EXIT.DOMAIN_MISMATCH : EXIT.RUNTIME_ERROR;
}

async function cancel(args) {
  const [job] = args;
  if (!job) {
    usage();
    process.exitCode = EXIT.RUNTIME_ERROR;
    return;
  }
  const task = await readTask(job);
  task.state = 'cancelled';
  task.approvalRequired = false;
  task.publicGatewayStarted = false;
  task.updatedAt = new Date().toISOString();
  task.next = 'No further action. This command did not stop or start unrelated services.';
  await writeTask(task);
  console.log(JSON.stringify(publicView(task), null, 2));
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!['prepare', 'status', 'resume', 'cancel'].includes(action)) {
    usage();
    process.exitCode = EXIT.RUNTIME_ERROR;
    return;
  }
  await ({ prepare, status, resume, cancel })[action](args);
}

main().catch((error) => {
  console.error(`state: runtime_error`);
  console.error(`message: ${sanitizeOutput(error?.message || error)}`);
  console.error('Public noVNC was not started.');
  process.exitCode = EXIT.RUNTIME_ERROR;
});
