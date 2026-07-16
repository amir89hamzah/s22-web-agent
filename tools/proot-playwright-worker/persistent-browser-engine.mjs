import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_REPO_ROOT = path.resolve(__dirname, '../..');
const SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const MAX_VISIBLE_TEXT = 12_000;
const MAX_INTERACTIVE_ELEMENTS = 150;

const BLOCKED_ACTION_TEXT =
  /\b(submit|save|apply|approve|reject|delete|remove|confirm|send|pay|purchase|checkout|book|login|log in|sign in|logout|log out)\b/i;

function assertSafeName(value, label) {
  if (!SAFE_NAME_RE.test(String(value || ''))) {
    throw new Error(
      `${label} invalid. Use letters, numbers, dot, underscore, or dash; max 64 characters.`
    );
  }
}

function parseHttpUrl(raw, label = 'url') {
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

function safeDisplayUrl(raw) {
  try {
    const url = new URL(String(raw || ''));
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '(invalid URL)';
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, {
    recursive: true,
    mode: 0o700,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chromiumLaunchArgs() {
  const defaults = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];

  const extra = String(process.env.CHROMIUM_FLAGS || '')
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...defaults, ...extra])];
}

export class PersistentBrowserEngine {
  constructor(options = {}) {
    this.repoRoot =
      options.repoRoot ||
      process.env.SESSION_REPO_ROOT ||
      DEFAULT_REPO_ROOT;

    this.chromiumPath =
      options.chromiumPath ||
      process.env.CHROMIUM_PATH ||
      process.env.CHROMIUM_EXECUTABLE ||
      '/usr/bin/chromium';

    this.display =
      options.display ||
      process.env.BROWSER_DISPLAY ||
      process.env.DISPLAY ||
      ':1';

    this.navigationTimeoutMs = Number(
      options.navigationTimeoutMs ||
      process.env.BROWSER_TASK_NAV_TIMEOUT_MS ||
      60_000
    );

    this.actionTimeoutMs = Number(
      options.actionTimeoutMs ||
      process.env.BROWSER_TASK_ACTION_TIMEOUT_MS ||
      30_000
    );

    this.active = null;
    this.trackedPages = new WeakSet();
  }

  trackPage(session, page) {
    if (
      !page ||
      page.isClosed() ||
      this.trackedPages.has(page)
    ) {
      return;
    }

    this.trackedPages.add(page);

    page.setDefaultNavigationTimeout(
      this.navigationTimeoutMs
    );
    page.setDefaultTimeout(
      this.actionTimeoutMs
    );

    page.on('response', (response) => {
      try {
        if (
          this.active !== session ||
          response.request().isNavigationRequest() === false ||
          response.frame() !== page.mainFrame()
        ) {
          return;
        }

        session.lastHttpStatus = response.status();
        session.updatedAt = new Date().toISOString();
      } catch {
        // A response may arrive while the page is closing.
      }
    });
  }

  recoverActivePage(session = this.active) {
    if (!session) {
      return null;
    }

    if (
      session.page &&
      !session.page.isClosed()
    ) {
      return session.page;
    }

    const pages =
      session.context
        ?.pages()
        .filter((page) => !page.isClosed()) ||
      [];

    const replacementPage =
      pages.at(-1) || null;

    if (!replacementPage) {
      return null;
    }

    this.trackPage(
      session,
      replacementPage
    );

    session.page = replacementPage;
    session.state = 'running';
    session.lastAction = 'page_recovered';
    session.updatedAt = new Date().toISOString();

    return replacementPage;
  }

  getStatus() {
    if (!this.active) {
      return {
        ok: true,
        active: false,
        state: 'idle',
      };
    }

    const page =
      this.recoverActivePage(this.active);

    const pageAlive = Boolean(page);

    return {
      ok: true,
      active: true,
      state: pageAlive ? this.active.state : 'browser_closed',
      job: this.active.job,
      profile: this.active.profile || null,
      browserAlive: Boolean(this.active.browser?.isConnected()),
      pageAlive,
      currentUrl: pageAlive
        ? safeDisplayUrl(page.url())
        : null,
      startedAt: this.active.startedAt,
      updatedAt: this.active.updatedAt,
      lastAction: this.active.lastAction,
      lastHttpStatus: this.active.lastHttpStatus,
      handoffActive: Boolean(this.active.handoffActive),
    };
  }

  requireActive(job) {
    assertSafeName(job, 'job');

    if (!this.active) {
      throw new Error('No persistent browser task is active.');
    }

    if (this.active.job !== job) {
      throw new Error(
        `Another browser task is active: ${this.active.job}`
      );
    }

    const page =
      this.recoverActivePage(this.active);

    if (!page) {
      throw new Error(
        'The persistent browser page is no longer available.'
      );
    }

    return this.active;
  }

  async start({ job, url, profile = '' }) {
    assertSafeName(job, 'job');

    if (profile) {
      assertSafeName(profile, 'profile');
    }

    const targetUrl = parseHttpUrl(url, 'start URL');

    if (this.active) {
      if (this.active.job === job) {
        return this.snapshot({ job });
      }

      throw new Error(
        `Only one persistent browser task is allowed. Active task: ${this.active.job}`
      );
    }

    const sessionDir = profile
      ? path.join(this.repoRoot, '.runtime', 'sessions', profile)
      : '';

    const storageStatePath = profile
      ? path.join(sessionDir, 'storageState.json')
      : '';

    const useSavedProfile =
      Boolean(storageStatePath) &&
      await fileExists(storageStatePath);

    const browser = await chromium.launch({
      executablePath: this.chromiumPath,
      headless: false,
      args: chromiumLaunchArgs(),
      env: {
        ...process.env,
        DISPLAY: this.display,
      },
    });

    const context = await browser.newContext(
      useSavedProfile
        ? { storageState: storageStatePath }
        : {}
    );

    const page = await context.newPage();

    const now = new Date().toISOString();

    this.active = {
      job,
      profile,
      browser,
      context,
      page,
      state: 'starting',
      startedAt: now,
      updatedAt: now,
      lastAction: 'start',
      lastHttpStatus: null,
      lastSnapshot: null,
      handoffActive: false,
      usedSavedProfile: useSavedProfile,
    };

    browser.on('disconnected', () => {
      if (this.active?.job === job) {
        this.active.state = 'browser_disconnected';
        this.active.updatedAt = new Date().toISOString();
      }
    });

    this.trackPage(this.active, page);

    context.on('page', (newPage) => {
      if (this.active?.job !== job) {
        return;
      }

      this.trackPage(
        this.active,
        newPage
      );

      this.active.page = newPage;
      this.active.state = 'running';
      this.active.lastAction = 'page_opened';
      this.active.updatedAt = new Date().toISOString();
    });

    try {
      const response = await page.goto(targetUrl.href, {
        waitUntil: 'domcontentloaded',
        timeout: this.navigationTimeoutMs,
      });

      if (response) {
        this.active.lastHttpStatus = response.status();
      }

      this.active.state = 'running';
      this.active.updatedAt = new Date().toISOString();

      return this.snapshot({ job });
    } catch (error) {
      await this.stop({
        job,
        reason: 'start_failed',
      }).catch(() => {});

      throw new Error(
        `Persistent browser start failed: ${error?.message || error}`
      );
    }
  }

  async snapshot({ job }) {
    const session = this.requireActive(job);
    const { page } = session;

    const pageData = await page.evaluate(
      ({ maxVisibleText, maxInteractiveElements }) => {
        const isVisible = (element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity || 1) > 0 &&
            rect.width > 0 &&
            rect.height > 0
          );
        };

        const compactText = (value, maxLength = 500) =>
          String(value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLength);

        document
          .querySelectorAll('[data-s22-agent-id]')
          .forEach((element) => {
            element.removeAttribute('data-s22-agent-id');
          });

        const headings = Array.from(
          document.querySelectorAll('h1,h2,h3,h4,h5,h6')
        )
          .filter(isVisible)
          .map((element) => ({
            level: element.tagName.toLowerCase(),
            text: compactText(element.innerText || element.textContent, 300),
          }))
          .filter((item) => item.text)
          .slice(0, 60);

        const elements = [];
        const candidates = Array.from(
          document.querySelectorAll(
            'a[href],button,[role="link"],[role="button"],input,select,textarea'
          )
        );

        for (const element of candidates) {
          if (elements.length >= maxInteractiveElements) break;
          if (!isVisible(element)) continue;

          const tag = element.tagName.toLowerCase();
          const role = compactText(element.getAttribute('role'), 80);
          const type = compactText(element.getAttribute('type'), 80);
          const ariaLabel = compactText(
            element.getAttribute('aria-label'),
            300
          );
          const placeholder = compactText(
            element.getAttribute('placeholder'),
            300
          );
          const title = compactText(
            element.getAttribute('title'),
            300
          );

          let label = '';

          if (
            'labels' in element &&
            element.labels &&
            element.labels.length
          ) {
            label = compactText(
              Array.from(element.labels)
                .map((item) => item.innerText || item.textContent)
                .join(' '),
              300
            );
          }

          const text = compactText(
            element.innerText || element.textContent,
            500
          );

          const id = `E${elements.length + 1}`;
          element.setAttribute('data-s22-agent-id', id);

          elements.push({
            id,
            tag,
            role: role || null,
            type: type || null,
            text: text || null,
            label: label || ariaLabel || placeholder || title || null,
            href:
              tag === 'a'
                ? compactText(element.href, 1_000)
                : null,
            disabled:
              Boolean(element.disabled) ||
              element.getAttribute('aria-disabled') === 'true',
          });
        }

        const visibleText = compactText(
          document.body?.innerText || '',
          maxVisibleText
        );

        const visiblePasswordFields = Array.from(
          document.querySelectorAll('input[type="password"]')
        ).filter(isVisible).length;

        const visibleInputLabels = elements
          .filter((item) =>
            ['input', 'select', 'textarea'].includes(item.tag)
          )
          .map((item) =>
            compactText(
              `${item.label || ''} ${item.text || ''}`,
              300
            ).toLowerCase()
          )
          .filter(Boolean);

        return {
          title: document.title || '',
          visibleText,
          headings,
          elements,
          visiblePasswordFields,
          visibleInputLabels,
        };
      },
      {
        maxVisibleText: MAX_VISIBLE_TEXT,
        maxInteractiveElements: MAX_INTERACTIVE_ELEMENTS,
      }
    );

    const currentUrl = page.url();
    const reasons = [];

    if (
      session.lastHttpStatus === 401 ||
      session.lastHttpStatus === 403
    ) {
      reasons.push(`http_${session.lastHttpStatus}`);
    }

    if (pageData.visiblePasswordFields > 0) {
      reasons.push('visible_password_field');
    }

    try {
      const pathname = new URL(currentUrl).pathname.toLowerCase();

      if (
        /\/(login|signin|sign-in|auth|sso)(\/|$|\.)/.test(pathname)
      ) {
        reasons.push('login_like_url');
      }
    } catch {
      // Current URL is supplied by Chromium and should normally be valid.
    }

    const fieldSummary = pageData.visibleInputLabels.join(' ');

    if (
      fieldSummary.includes('company code') &&
      (
        fieldSummary.includes('user id') ||
        fieldSummary.includes('username')
      )
    ) {
      reasons.push('company_user_login_form');
    }

    const screenshotDir = path.join(
      this.repoRoot,
      '.runtime',
      'browser-tasks',
      job
    );

    await ensureDir(screenshotDir);

    const screenshotPath = path.join(
      screenshotDir,
      'last-page.png'
    );

    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    }).catch(() => {});

    session.lastSnapshot = {
      title: pageData.title,
      currentUrl,
      screenshotPath,
      capturedAt: new Date().toISOString(),
    };

    session.updatedAt = session.lastSnapshot.capturedAt;

    return {
      ok: true,
      state: reasons.length
        ? 'human_help_required'
        : session.state,
      job,
      profile: session.profile || null,
      browserAlive: session.browser.isConnected(),
      usedSavedProfile: session.usedSavedProfile,
      page: {
        title: pageData.title,
        url: safeDisplayUrl(currentUrl),
        httpStatus: session.lastHttpStatus,
        visibleText: pageData.visibleText,
        headings: pageData.headings,
        elements: pageData.elements,
        screenshotPath: path.relative(
          this.repoRoot,
          screenshotPath
        ),
      },
      loginWall: {
        detected: reasons.length > 0,
        reasons: [...new Set(reasons)],
      },
      handoffActive: session.handoffActive,
      lastAction: session.lastAction,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      safety:
        'Field names and labels may be returned, but field values, passwords, cookies, tokens, and storageState contents are never returned.',
    };
  }

  async act({
    job,
    action,
    targetId = '',
    direction = 'down',
    url = '',
  }) {
    const session = this.requireActive(job);
    const { page } = session;

    if (session.handoffActive) {
      throw new Error(
        'Human browser handoff is active. Complete the handoff before agent actions resume.'
      );
    }

    if (action === 'snapshot') {
      session.lastAction = 'snapshot';
      return this.snapshot({ job });
    }

    if (action === 'navigate') {
      const targetUrl =
        parseHttpUrl(
          url,
          'navigate URL'
        );

      const response = await page.goto(
        targetUrl.href,
        {
          waitUntil: 'domcontentloaded',
          timeout: this.navigationTimeoutMs,
        }
      );

      if (response) {
        session.lastHttpStatus =
          response.status();
      }

      session.state = 'running';
      session.lastAction = 'navigate';
      session.updatedAt =
        new Date().toISOString();

      return this.snapshot({ job });
    }

    if (action === 'back') {
      await page.goBack({
        waitUntil: 'domcontentloaded',
        timeout: this.navigationTimeoutMs,
      }).catch(() => null);

      session.lastAction = 'back';
      return this.snapshot({ job });
    }

    if (action === 'reload') {
      await page.reload({
        waitUntil: 'domcontentloaded',
        timeout: this.navigationTimeoutMs,
      });

      session.lastAction = 'reload';
      return this.snapshot({ job });
    }

    if (action === 'scroll') {
      const amount =
        direction === 'up'
          ? -Math.max(400, Math.floor((await page.evaluate(() => window.innerHeight)) * 0.8))
          : Math.max(400, Math.floor((await page.evaluate(() => window.innerHeight)) * 0.8));

      await page.evaluate((scrollAmount) => {
        window.scrollBy({
          top: scrollAmount,
          behavior: 'instant',
        });
      }, amount);

      await sleep(300);
      session.lastAction = `scroll_${direction}`;
      return this.snapshot({ job });
    }

    if (action === 'click') {
      if (!/^E\d+$/.test(targetId)) {
        throw new Error(
          'targetId is required for click and must look like E1, E2, or E3.'
        );
      }

      const locator = page.locator(
        `[data-s22-agent-id="${targetId}"]`
      );

      if ((await locator.count()) !== 1) {
        throw new Error(
          `Target ${targetId} is missing or no longer unique. Request a fresh snapshot.`
        );
      }

      const metadata = await locator.evaluate((element) => ({
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role') || '',
        type: element.getAttribute('type') || '',
        text:
          element.innerText ||
          element.textContent ||
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          '',
        disabled:
          Boolean(element.disabled) ||
          element.getAttribute('aria-disabled') === 'true',
      }));

      if (metadata.disabled) {
        throw new Error(`Target ${targetId} is disabled.`);
      }

      if (
        ['input', 'select', 'textarea'].includes(metadata.tag)
      ) {
        throw new Error(
          'Phase 7R read-only mode does not allow field interaction.'
        );
      }

      if (
        metadata.type.toLowerCase() === 'submit' ||
        BLOCKED_ACTION_TEXT.test(String(metadata.text || ''))
      ) {
        throw new Error(
          'Phase 7R blocked a consequential or form-submission control.'
        );
      }

      await locator.click({
        timeout: this.actionTimeoutMs,
      });

      await Promise.race([
        page
          .waitForLoadState('domcontentloaded', {
            timeout: 5_000,
          })
          .catch(() => {}),
        sleep(1_200),
      ]);

      session.lastAction = `click_${targetId}`;
      session.updatedAt = new Date().toISOString();

      return this.snapshot({ job });
    }

    throw new Error(
      `Unsupported browser action: ${action}`
    );
  }

  async beginHandoff({ job }) {
    const session = this.requireActive(job);
    session.handoffActive = true;
    session.state = 'human_help_required';
    session.lastAction = 'handoff_started';
    session.updatedAt = new Date().toISOString();

    return this.snapshot({ job });
  }

  async completeHandoff({ job, saveProfile = true }) {
    const session = this.requireActive(job);

    if (!session.handoffActive) {
      throw new Error('No human browser handoff is active.');
    }

    if (saveProfile && session.profile) {
      await this.saveProfile({
        job,
        profile: session.profile,
      });
    }

    session.handoffActive = false;
    session.state = 'running';
    session.lastAction = 'handoff_completed';
    session.updatedAt = new Date().toISOString();

    return this.snapshot({ job });
  }

  async saveProfile({ job, profile }) {
    const session = this.requireActive(job);
    assertSafeName(profile, 'profile');

    const sessionDir = path.join(
      this.repoRoot,
      '.runtime',
      'sessions',
      profile
    );

    await ensureDir(sessionDir);

    const storageStatePath = path.join(
      sessionDir,
      'storageState.json'
    );

    const metadataPath = path.join(
      sessionDir,
      'metadata.json'
    );

    await session.context.storageState({
      path: storageStatePath,
    });

    const currentUrl = session.page.url();
    const currentHost = parseHttpUrl(
      currentUrl,
      'current page URL'
    ).hostname.toLowerCase();

    await fs.writeFile(
      metadataPath,
      `${JSON.stringify(
        {
          profile,
          captureMode: 'persistent-browser-task',
          finalUrl: safeDisplayUrl(currentUrl),
          allowedDomains: [currentHost],
          allowedDomain: currentHost,
          createdAt: new Date().toISOString(),
          storageState: 'stored locally; value not printed',
          safety:
            'No password, cookie, token, localStorage, sessionStorage, or storageState JSON was printed.',
        },
        null,
        2
      )}\n`,
      {
        mode: 0o600,
      }
    );

    session.profile = profile;
    session.updatedAt = new Date().toISOString();

    return {
      ok: true,
      job,
      profile,
      storageStateSaved: true,
      metadataSaved: true,
      safety:
        'The profile was saved locally. Secret session values were not returned.',
    };
  }

  async stop({ job, reason = 'completed' }) {
    const session = this.requireActive(job);

    const result = {
      ok: true,
      job,
      reason,
      stoppedAt: new Date().toISOString(),
    };

    this.active = null;

    await session.context?.close().catch(() => {});
    await session.browser?.close().catch(() => {});

    return result;
  }
}
