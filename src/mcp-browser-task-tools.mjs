import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import {
  runBrowserTask,
  handoffBrowserTask,
  statusBrowserTask,
} from '../tools/browser-task-orchestrator.mjs';

const THIS_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(THIS_FILE), '..');
const TASKS_ROOT = path.join(REPO_ROOT, '.runtime', 'browser-tasks');

const SAFE_NAME_RE =
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

const MAX_SCREENSHOT_BYTES = Number(
  process.env.MCP_BROWSER_SCREENSHOT_MAX_BYTES ||
  10 * 1024 * 1024
);

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

function cleanForText(value) {
  if (Array.isArray(value)) {
    return value.map(cleanForText);
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    const cleaned = {};

    for (const [key, item] of Object.entries(value)) {
      if (
        key.toLowerCase() ===
        'screenshotpath'
      ) {
        continue;
      }

      cleaned[key] = cleanForText(item);
    }

    return cleaned;
  }

  if (typeof value === 'string') {
    return value
      .replaceAll(REPO_ROOT, '[repo]')
      .replace(
        /\.runtime\/browser-tasks\/[a-zA-Z0-9._-]+\/last-page\.png/g,
        '[screenshot]'
      );
  }

  return value;
}

function currentScreenshotPath(
  result,
  source
) {
  if (source === 'status') {
    return (
      result?.task?.lastPage?.screenshotPath ||
      result?.worker?.page?.screenshotPath ||
      result?.worker?.lastSnapshot?.screenshotPath ||
      null
    );
  }

  return (
    result?.browser?.page?.screenshotPath ||
    null
  );
}

async function readTaskScreenshot({
  job,
  reportedPath,
}) {
  if (!reportedPath) {
    return {
      attached: false,
      reason: 'not_available',
      image: null,
    };
  }

  if (!SAFE_NAME_RE.test(job)) {
    return {
      attached: false,
      reason: 'invalid_job',
      image: null,
    };
  }

  const taskRoot = path.resolve(
    TASKS_ROOT,
    job
  );

  const expectedPath = path.resolve(
    taskRoot,
    'last-page.png'
  );

  const reportedAbsolute = path.resolve(
    REPO_ROOT,
    String(reportedPath)
  );

  if (reportedAbsolute !== expectedPath) {
    return {
      attached: false,
      reason: 'unexpected_screenshot_path',
      image: null,
    };
  }

  try {
    const fileInfo =
      await fs.lstat(expectedPath);

    if (
      !fileInfo.isFile() ||
      fileInfo.isSymbolicLink()
    ) {
      return {
        attached: false,
        reason: 'screenshot_not_regular_file',
        image: null,
      };
    }

    if (
      fileInfo.size <= 0 ||
      fileInfo.size > MAX_SCREENSHOT_BYTES
    ) {
      return {
        attached: false,
        reason: 'screenshot_size_rejected',
        image: null,
      };
    }

    const realTaskRoot =
      await fs.realpath(taskRoot);

    const realScreenshotPath =
      await fs.realpath(expectedPath);

    if (
      path.dirname(realScreenshotPath) !==
      realTaskRoot
    ) {
      return {
        attached: false,
        reason: 'screenshot_outside_task_directory',
        image: null,
      };
    }

    const buffer =
      await fs.readFile(realScreenshotPath);

    if (
      buffer.length < PNG_SIGNATURE.length ||
      !buffer
        .subarray(0, PNG_SIGNATURE.length)
        .equals(PNG_SIGNATURE)
    ) {
      return {
        attached: false,
        reason: 'invalid_png_signature',
        image: null,
      };
    }

    return {
      attached: true,
      reason: null,
      image: {
        type: 'image',
        data: buffer.toString('base64'),
        mimeType: 'image/png',
      },
    };
  } catch (error) {
    return {
      attached: false,
      reason:
        error?.code === 'ENOENT'
          ? 'screenshot_not_found'
          : 'screenshot_read_failed',
      image: null,
    };
  }
}

async function toMcpResult({
  result,
  job,
  screenshotSource,
}) {
  const reportedPath =
    currentScreenshotPath(
      result,
      screenshotSource
    );

  const screenshot =
    await readTaskScreenshot({
      job,
      reportedPath,
    });

  const textResult = {
    ...cleanForText(result),
    mcpImage: {
      attached: screenshot.attached,
      mimeType: screenshot.attached
        ? 'image/png'
        : null,
      reason: screenshot.reason,
    },
  };

  const content = [
    {
      type: 'text',
      text: JSON.stringify(
        textResult,
        null,
        2
      ),
    },
  ];

  if (screenshot.image) {
    content.push(screenshot.image);
  }

  return {
    isError: result?.ok === false,
    content,
  };
}

async function safeTool(handler) {
  try {
    return await handler();
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text:
            error?.message ||
            String(error),
        },
      ],
    };
  }
}

export function registerBrowserTaskTools(
  server
) {
  server.tool(
    'browser_task_run',
    'Run or continue one persistent read-only browser task on the S22. Supports start, snapshot, click, scroll, back, reload, complete, and cancel. Only one browser task may be active at a time.',
    {
      job: z
        .string()
        .regex(SAFE_NAME_RE)
        .describe(
          'Safe browser task identifier using letters, numbers, dot, underscore, or dash; max 64 characters.'
        ),
      action: z
        .enum([
          'start',
          'snapshot',
          'click',
          'scroll',
          'back',
          'reload',
          'complete',
          'cancel',
        ])
        .optional()
        .describe(
          'Browser task action. If omitted, starts a new task or snapshots the active task with the same job.'
        ),
      objective: z
        .string()
        .min(1)
        .max(2000)
        .optional()
        .describe(
          'Read-only objective. Required when starting a new task.'
        ),
      profile: z
        .string()
        .regex(SAFE_NAME_RE)
        .optional()
        .describe(
          'Optional named local browser profile. Never provide a path, credential, cookie, token, or storageState content.'
        ),
      startUrl: z
        .string()
        .url()
        .optional()
        .describe(
          'HTTP or HTTPS starting URL. Required when starting a new task.'
        ),
      targetId: z
        .string()
        .regex(/^E\d+$/)
        .optional()
        .describe(
          'Interactive element ID from the latest snapshot, such as E1. Used only with click.'
        ),
      direction: z
        .enum(['up', 'down'])
        .optional()
        .describe(
          'Scroll direction. Defaults to down.'
        ),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async (input) =>
      safeTool(async () => {
        const result =
          await runBrowserTask(input);

        return toMcpResult({
          result,
          job: input.job,
          screenshotSource: 'browser',
        });
      })
  );

  server.tool(
    'browser_task_handoff',
    'Request or complete a clarification or temporary human browser-control handoff while preserving the same persistent Chromium session.',
    {
      job: z
        .string()
        .regex(SAFE_NAME_RE)
        .describe(
          'Existing persistent browser task identifier.'
        ),
      action: z
        .enum(['request', 'complete'])
        .optional()
        .describe(
          'Request or complete the handoff. Defaults to request.'
        ),
      type: z
        .enum([
          'clarification',
          'browser_control',
        ])
        .optional()
        .describe(
          'Clarification stays in chat. Browser control uses the same persistent Chromium through the approved noVNC path.'
        ),
      reason: z
        .string()
        .max(200)
        .optional()
        .describe(
          'Short non-secret reason for human assistance.'
        ),
      message: z
        .string()
        .max(1500)
        .optional()
        .describe(
          'Question or safe instruction to present to the user.'
        ),
      saveProfile: z
        .boolean()
        .optional()
        .describe(
          'When completing browser control, save the named local profile unless explicitly false.'
        ),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    async (input) =>
      safeTool(async () => {
        const result =
          await handoffBrowserTask(input);

        return toMcpResult({
          result,
          job: input.job,
          screenshotSource: 'browser',
        });
      })
  );

  server.tool(
    'browser_task_status',
    'Read saved browser-task metadata, persistent worker status, and current S22 device health without starting a browser action.',
    {
      job: z
        .string()
        .regex(SAFE_NAME_RE)
        .describe(
          'Browser task identifier to inspect.'
        ),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    async ({ job }) =>
      safeTool(async () => {
        const result =
          await statusBrowserTask(job);

        return toMcpResult({
          result,
          job,
          screenshotSource: 'status',
        });
      })
  );

  return server;
}
