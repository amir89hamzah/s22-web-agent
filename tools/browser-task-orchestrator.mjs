#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDeviceHealth } from '../src/device-health.mjs';

const THIS_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(THIS_FILE), '..');

const WORKER_URL =
  process.env.BROWSER_WORKER_URL ||
  'http://127.0.0.1:3002';

const TASKS_ROOT = path.join(
  REPO_ROOT,
  '.runtime',
  'browser-tasks'
);

const SAFE_NAME_RE =
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

const RUN_ACTIONS = new Set([
  'start',
  'snapshot',
  'click',
  'scroll',
  'back',
  'reload',
  'complete',
  'cancel',
]);

const HANDOFF_ACTIONS = new Set([
  'request',
  'complete',
]);

const HANDOFF_TYPES = new Set([
  'clarification',
  'browser_control',
]);

function nowIso() {
  return new Date().toISOString();
}

function assertSafeName(value, label) {
  if (!SAFE_NAME_RE.test(String(value || ''))) {
    throw new Error(
      `${label} invalid. Use letters, numbers, dot, underscore, or dash; max 64 characters.`
    );
  }
}

function cleanText(value, label, maxLength = 1000) {
  const text = String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();

  if (!text) {
    throw new Error(`${label} is required.`);
  }

  if (text.length > maxLength) {
    throw new Error(
      `${label} exceeds the ${maxLength}-character limit.`
    );
  }

  return text;
}

function optionalText(value, maxLength = 1000) {
  const text = String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();

  return text.slice(0, maxLength);
}

function parseHttpUrl(raw, label = 'URL') {
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
    throw new Error(
      `${label} must not contain embedded credentials.`
    );
  }

  return url;
}

function safeStoredUrl(raw) {
  try {
    const url = new URL(String(raw || ''));

    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';

    return url.href;
  } catch {
    return null;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, {
    recursive: true,
    mode: 0o700,
  });
}

async function readJson(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeJsonAtomic(filePath, data) {
  await ensureDir(path.dirname(filePath));

  const temporaryPath =
    `${filePath}.${process.pid}.tmp`;

  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify(data, null, 2)}\n`,
    {
      mode: 0o600,
    }
  );

  await fs.rename(temporaryPath, filePath);
}

function taskFile(job) {
  return path.join(
    TASKS_ROOT,
    job,
    'task.json'
  );
}

async function loadTask(job) {
  assertSafeName(job, 'job');
  return readJson(taskFile(job));
}

async function saveTask(task) {
  await writeJsonAtomic(
    taskFile(task.job),
    task
  );

  return task;
}

function compactHealth(health) {
  return {
    sampledAt: health?.sampledAt || null,
    memory: {
      availableMb:
        health?.memory?.availableMb ?? null,
      usedPercent:
        health?.memory?.usedPercent ?? null,
    },
    processes: {
      totalVisible:
        health?.processes?.totalVisible ?? null,
      chromium:
        health?.processes?.chromium ?? null,
      node:
        health?.processes?.node ?? null,
      proot:
        health?.processes?.proot ?? null,
      xtigervnc:
        health?.processes?.xtigervnc ?? null,
      websockify:
        health?.processes?.websockify ?? null,
      cloudflared:
        health?.processes?.cloudflared ?? null,
    },
    temperature: {
      maxReadableC:
        health?.temperature?.maxReadableC ?? null,
      cpuMaxC:
        health?.temperature?.cpuMaxC ?? null,
      gpuMaxC:
        health?.temperature?.gpuMaxC ?? null,
    },
  };
}

async function workerRequest(
  endpoint,
  {
    method = 'GET',
    body,
    allowUnavailable = false,
    timeoutMs,
  } = {}
) {
  const controller = new AbortController();

  const effectiveTimeoutMs =
    Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : method === 'GET'
        ? 15_000
        : 75_000;

  const timer = setTimeout(
    () => controller.abort(),
    effectiveTimeoutMs
  );

  try {
    const response = await fetch(
      `${WORKER_URL}${endpoint}`,
      {
        method,
        headers: body
          ? { 'content-type': 'application/json' }
          : undefined,
        body: body
          ? JSON.stringify(body)
          : undefined,
        signal: controller.signal,
      }
    );

    const raw = await response.text();

    let data;

    try {
      data = raw
        ? JSON.parse(raw)
        : {};
    } catch {
      throw new Error(
        `Worker returned invalid JSON with HTTP ${response.status}.`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        `Worker request failed with HTTP ${response.status}.`
      );
    }

    return {
      reachable: true,
      ...data,
    };
  } catch (error) {
    if (allowUnavailable) {
      return {
        ok: false,
        reachable: false,
        error:
          error?.name === 'AbortError'
            ? 'worker_request_timeout'
            : error?.message || String(error),
      };
    }

    throw new Error(
      error?.name === 'AbortError'
        ? 'Playwright worker request timed out.'
        : `Playwright worker unavailable: ${error?.message || error}`
    );
  } finally {
    clearTimeout(timer);
  }
}

async function getWorkerStatus({
  allowUnavailable = false,
} = {}) {
  return workerRequest(
    '/browser-task/status',
    { allowUnavailable }
  );
}

function summarizePage(workerResult) {
  const page = workerResult?.page;

  if (!page) {
    return null;
  }

  return {
    title:
      optionalText(page.title, 500) || null,
    url:
      safeStoredUrl(page.url),
    httpStatus:
      Number.isFinite(page.httpStatus)
        ? page.httpStatus
        : null,
    elementCount:
      Array.isArray(page.elements)
        ? page.elements.length
        : 0,
    screenshotPath:
      optionalText(page.screenshotPath, 1000) ||
      null,
  };
}

function automaticHelp(workerResult) {
  if (
    workerResult?.state !==
    'human_help_required'
  ) {
    return null;
  }

  const reasons =
    workerResult?.loginWall?.reasons || [];

  const loginDetected =
    workerResult?.loginWall?.detected === true;

  return {
    type: 'browser_control',
    reason: loginDetected
      ? 'login'
      : 'navigation',
    message: loginDetected
      ? 'The browser reached a login wall. Human login is required in the same persistent browser.'
      : 'The browser requires human assistance before the agent can continue.',
    signals: reasons,
    requestedAt: nowIso(),
    automatic: true,
  };
}

function createTask({
  job,
  objective,
  profile,
  startUrl,
}) {
  const timestamp = nowIso();

  return {
    version: 1,
    job,
    objective,
    profile: profile || null,
    startUrl:
      safeStoredUrl(startUrl),
    state: 'created',
    help: null,
    browserSessionStartedAt: null,
    lastPage: null,
    lastAction: null,
    lastError: null,
    lastDeviceHealth: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    cancelledAt: null,
    safety:
      'Task metadata excludes passwords, cookies, tokens, field values, and storageState contents.',
  };
}

function publicTask(task) {
  if (!task) return null;

  return {
    version: task.version,
    job: task.job,
    objective: task.objective,
    profile: task.profile,
    startUrl: task.startUrl,
    state: task.state,
    help: task.help,
    browserSessionStartedAt:
      task.browserSessionStartedAt,
    lastPage: task.lastPage,
    lastAction: task.lastAction,
    lastError: task.lastError,
    lastDeviceHealth:
      task.lastDeviceHealth,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
    safety: task.safety,
  };
}

async function updateTaskFromWorker({
  task,
  workerResult,
  action,
  deviceHealth,
}) {
  const updated = {
    ...task,
    state:
      workerResult?.state ||
      task.state ||
      'running',
    browserSessionStartedAt:
      workerResult?.startedAt ||
      task.browserSessionStartedAt,
    lastPage:
      summarizePage(workerResult) ||
      task.lastPage,
    lastAction:
      workerResult?.lastAction ||
      action,
    lastError: null,
    lastDeviceHealth:
      compactHealth(deviceHealth),
    updatedAt: nowIso(),
  };

  const help = automaticHelp(workerResult);

  if (help) {
    updated.help = help;
  } else if (
    updated.help?.automatic === true
  ) {
    updated.help = null;
  }

  await saveTask(updated);
  return updated;
}

async function failureResult({
  job,
  task,
  error,
}) {
  const deviceHealth =
    await collectDeviceHealth().catch(() => null);

  let updatedTask = task;

  if (task) {
    updatedTask = {
      ...task,
      state: 'runtime_error',
      lastError:
        error?.message || String(error),
      lastDeviceHealth:
        compactHealth(deviceHealth),
      updatedAt: nowIso(),
    };

    await saveTask(updatedTask).catch(() => {});
  }

  return {
    ok: false,
    state: 'runtime_error',
    job: job || null,
    error:
      error?.message || String(error),
    task: publicTask(updatedTask),
    deviceHealth,
    next:
      'Check the stable worker, VNC display, network, or task status before retrying.',
  };
}

export async function runBrowserTask(input = {}) {
  const job = String(input.job || '').trim();
  let task = null;

  try {
    assertSafeName(job, 'job');

    task = await loadTask(job);

    const requestedAction =
      String(input.action || '').trim();

    if (
      requestedAction &&
      !RUN_ACTIONS.has(requestedAction)
    ) {
      throw new Error(
        `Unsupported browser task action: ${requestedAction}`
      );
    }

    const workerStatus =
      await getWorkerStatus();

    let action = requestedAction;

    if (!action) {
      action =
        workerStatus.active &&
        workerStatus.job === job
          ? 'snapshot'
          : 'start';
    }

    let workerResult;

    if (action === 'start') {
      if (
        workerStatus.active &&
        workerStatus.job !== job
      ) {
        throw new Error(
          `Another persistent browser task is active: ${workerStatus.job}`
        );
      }

      const objective =
        input.objective
          ? cleanText(
              input.objective,
              'objective',
              2000
            )
          : task?.objective;

      if (!objective) {
        throw new Error(
          'objective is required when starting a browser task.'
        );
      }

      const profile =
        String(
          input.profile ||
          task?.profile ||
          ''
        ).trim();

      if (profile) {
        assertSafeName(profile, 'profile');
      }

      const rawStartUrl =
        String(
          input.startUrl ||
          task?.startUrl ||
          ''
        ).trim();

      const startUrl =
        parseHttpUrl(
          rawStartUrl,
          'startUrl'
        ).href;

      task = task || createTask({
        job,
        objective,
        profile,
        startUrl,
      });

      task = {
        ...task,
        objective,
        profile: profile || null,
        startUrl:
          safeStoredUrl(startUrl),
        state: 'starting',
        lastError: null,
        updatedAt: nowIso(),
      };

      await saveTask(task);

      if (
        workerStatus.active &&
        workerStatus.job === job
      ) {
        workerResult = await workerRequest(
          '/browser-task/snapshot',
          {
            method: 'POST',
            body: { job },
          }
        );
      } else {
        workerResult = await workerRequest(
          '/browser-task/start',
          {
            method: 'POST',
            body: {
              job,
              url: startUrl,
              profile,
            },
          }
        );
      }
    } else if (
      [
        'snapshot',
        'click',
        'scroll',
        'back',
        'reload',
      ].includes(action)
    ) {
      if (
        !workerStatus.active ||
        workerStatus.job !== job
      ) {
        throw new Error(
          `Persistent browser task ${job} is not active.`
        );
      }

      workerResult = await workerRequest(
        action === 'snapshot'
          ? '/browser-task/snapshot'
          : '/browser-task/act',
        {
          method: 'POST',
          body:
            action === 'snapshot'
              ? { job }
              : {
                  job,
                  action,
                  targetId:
                    String(
                      input.targetId || ''
                    ).trim(),
                  direction:
                    String(
                      input.direction ||
                      'down'
                    ).trim(),
                },
        }
      );
    } else if (
      action === 'complete' ||
      action === 'cancel'
    ) {
      if (
        workerStatus.active &&
        workerStatus.job === job
      ) {
        workerResult = await workerRequest(
          '/browser-task/stop',
          {
            method: 'POST',
            body: {
              job,
              reason:
                action === 'complete'
                  ? 'completed'
                  : 'cancelled',
            },
          }
        );
      } else {
        workerResult = {
          ok: true,
          state: 'idle',
          job,
          reason:
            action === 'complete'
              ? 'completed'
              : 'cancelled',
        };
      }

      const deviceHealth =
        await collectDeviceHealth();

      task = task || createTask({
        job,
        objective:
          optionalText(
            input.objective,
            2000
          ) || 'Browser task',
        profile:
          String(input.profile || ''),
        startUrl:
          String(
            input.startUrl ||
            'https://example.com/'
          ),
      });

      task = {
        ...task,
        state:
          action === 'complete'
            ? 'completed'
            : 'cancelled',
        help: null,
        lastAction: action,
        lastError: null,
        lastDeviceHealth:
          compactHealth(deviceHealth),
        updatedAt: nowIso(),
        completedAt:
          action === 'complete'
            ? nowIso()
            : task.completedAt,
        cancelledAt:
          action === 'cancel'
            ? nowIso()
            : task.cancelledAt,
      };

      await saveTask(task);

      return {
        ok: true,
        state: task.state,
        task: publicTask(task),
        browser: workerResult,
        deviceHealth,
      };
    }

    const deviceHealth =
      await collectDeviceHealth();

    task = await updateTaskFromWorker({
      task,
      workerResult,
      action,
      deviceHealth,
    });

    return {
      ok: true,
      state: task.state,
      task: publicTask(task),
      browser: workerResult,
      deviceHealth,
      next:
        task.state ===
        'human_help_required'
          ? 'Use browser_task_handoff to request clarification or temporary human browser control.'
          : 'Review the page snapshot and choose the next safe browser action.',
    };
  } catch (error) {
    return failureResult({
      job,
      task,
      error,
    });
  }
}

export async function handoffBrowserTask(
  input = {}
) {
  const job = String(input.job || '').trim();
  let task = null;

  try {
    assertSafeName(job, 'job');

    const action =
      String(
        input.action || 'request'
      ).trim();

    if (!HANDOFF_ACTIONS.has(action)) {
      throw new Error(
        `Unsupported handoff action: ${action}`
      );
    }

    task = await loadTask(job);

    if (!task) {
      throw new Error(
        `Browser task not found: ${job}`
      );
    }

    const type =
      String(
        input.type ||
        task.help?.type ||
        'browser_control'
      ).trim();

    if (!HANDOFF_TYPES.has(type)) {
      throw new Error(
        `Unsupported handoff type: ${type}`
      );
    }

    let workerResult = null;

    if (action === 'request') {
      const reason =
        optionalText(
          input.reason,
          200
        ) ||
        task.help?.reason ||
        'human_assistance';

      const message =
        optionalText(
          input.message,
          1500
        ) ||
        task.help?.message ||
        'Human assistance is required.';

      if (type === 'browser_control') {
        const workerStatus =
          await getWorkerStatus();

        if (
          !workerStatus.active ||
          workerStatus.job !== job
        ) {
          throw new Error(
            `Persistent browser task ${job} is not active.`
          );
        }

        workerResult = await workerRequest(
          '/browser-task/handoff/start',
          {
            method: 'POST',
            body: { job },
          }
        );
      }

      task = {
        ...task,
        state:
          type === 'clarification'
            ? 'user_choice_required'
            : 'waiting_for_human_help',
        help: {
          type,
          reason,
          message,
          requestedAt: nowIso(),
          automatic: false,
        },
        lastAction: 'handoff_request',
        lastError: null,
        updatedAt: nowIso(),
      };
    } else {
      if (
        task.help?.type ===
        'browser_control'
      ) {
        workerResult = await workerRequest(
          '/browser-task/handoff/complete',
          {
            method: 'POST',
            body: {
              job,
              saveProfile:
                input.saveProfile !== false,
            },
          }
        );
      }

      task = {
        ...task,
        state:
          workerResult?.state ||
          'running',
        help: null,
        lastPage:
          summarizePage(workerResult) ||
          task.lastPage,
        browserSessionStartedAt:
          workerResult?.startedAt ||
          task.browserSessionStartedAt,
        lastAction: 'handoff_complete',
        lastError: null,
        updatedAt: nowIso(),
      };

      const automatic =
        automaticHelp(workerResult);

      if (automatic) {
        task.help = automatic;
        task.state =
          'human_help_required';
      }
    }

    const deviceHealth =
      await collectDeviceHealth();

    task.lastDeviceHealth =
      compactHealth(deviceHealth);

    await saveTask(task);

    return {
      ok: true,
      state: task.state,
      task: publicTask(task),
      browser: workerResult,
      deviceHealth,
      next:
        action === 'request'
          ? type === 'clarification'
            ? 'Ask the user the stated question. No noVNC browser control is required.'
            : 'Open the protected noVNC path only after explicit user approval. The persistent Chromium must not be restarted.'
          : task.state ===
            'human_help_required'
            ? 'Human assistance appears incomplete. Review the current browser page.'
            : 'Resume the original browser task using browser_task_run.',
    };
  } catch (error) {
    return failureResult({
      job,
      task,
      error,
    });
  }
}

export async function statusBrowserTask(job) {
  const normalizedJob =
    String(job || '').trim();

  try {
    assertSafeName(
      normalizedJob,
      'job'
    );

    const [
      task,
      worker,
      deviceHealth,
    ] = await Promise.all([
      loadTask(normalizedJob),
      getWorkerStatus({
        allowUnavailable: true,
      }),
      collectDeviceHealth(),
    ]);

    return {
      ok: true,
      state:
        task?.state ||
        (
          worker?.active &&
          worker?.job === normalizedJob
            ? worker.state
            : 'not_found'
        ),
      task:
        publicTask(task),
      worker,
      deviceHealth,
      next:
        !worker.reachable
          ? 'Start the stable Playwright worker before running a browser action.'
          : task
            ? 'Review the task and worker state before choosing the next action.'
            : 'No saved task exists for this job.',
    };
  } catch (error) {
    return failureResult({
      job: normalizedJob,
      task: null,
      error,
    });
  }
}

function parseJsonArgument(raw) {
  try {
    return JSON.parse(String(raw || ''));
  } catch {
    throw new Error(
      'The command requires one valid JSON argument.'
    );
  }
}

async function main() {
  const command =
    String(process.argv[2] || '').trim();

  let result;

  if (command === 'run') {
    result = await runBrowserTask(
      parseJsonArgument(process.argv[3])
    );
  } else if (command === 'handoff') {
    result = await handoffBrowserTask(
      parseJsonArgument(process.argv[3])
    );
  } else if (command === 'status') {
    result = await statusBrowserTask(
      process.argv[3]
    );
  } else {
    throw new Error(
      'Usage: browser-task-orchestrator.mjs run <json> | handoff <json> | status <job>'
    );
  }

  process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`
  );

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === THIS_FILE) {
  main().catch(async (error) => {
    const deviceHealth =
      await collectDeviceHealth().catch(
        () => null
      );

    console.error(
      JSON.stringify(
        {
          ok: false,
          state: 'runtime_error',
          error:
            error?.message ||
            String(error),
          deviceHealth,
        },
        null,
        2
      )
    );

    process.exitCode = 1;
  });
}
