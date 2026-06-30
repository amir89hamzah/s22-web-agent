#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const SAFE_PROFILE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const POLL_MS = Number(process.env.SESSION_LOGIN_POLL_MS || 1000);
const TIMEOUT_MS = Number(process.env.SESSION_LOGIN_TIMEOUT_MS || 15 * 60 * 1000);

function fail(message, code = 1) {
  console.error(`FAIL: ${message}`);
  process.exit(code);
}

function usage() {
  console.error('Usage: node tools/proot-playwright-worker/session-manual-login-worker.mjs <profile> <url>');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

function sanitizeHost(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function uniq(values) {
  return [...new Set(values.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const [profile, rawUrl] = process.argv.slice(2);

  if (!profile || !rawUrl) {
    usage();
    fail('profile and url are required.');
  }

  if (!SAFE_PROFILE_RE.test(profile)) {
    fail('profile invalid. Use only letters, numbers, dot, underscore, and dash; max 64 chars; first char must be alphanumeric.');
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    fail(`url is invalid: ${rawUrl}`);
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    fail('url must use http or https.');
  }

  const repoRoot = process.cwd();
  const runtimeDir = path.join(repoRoot, '.runtime');
  const jobsDir = path.join(runtimeDir, 'manual-login-jobs');
  const sessionsDir = path.join(runtimeDir, 'sessions');
  const sessionDir = path.join(sessionsDir, profile);
  const statePath = path.join(jobsDir, `${profile}.json`);
  const donePath = path.join(jobsDir, `${profile}.done`);
  const storageStatePath = path.join(sessionDir, 'storageState.json');
  const metadataPath = path.join(sessionDir, 'metadata.json');
  const startedAt = new Date().toISOString();

  await ensureDir(jobsDir);
  await ensureDir(sessionDir);
  await fs.rm(donePath, { force: true });

  await writeJson(statePath, {
    ok: true,
    status: 'pending',
    profile,
    url: targetUrl.href,
    targetHost: targetUrl.hostname.toLowerCase(),
    startedAt,
    instruction: 'Open aVNC/noVNC, complete login manually, then run complete_manual_login for this profile.',
    safety: 'No password, cookie, token, localStorage, sessionStorage, or storageState JSON is printed.',
  });

  const executablePath = process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium';
  const headless = process.env.SESSION_LOGIN_HEADLESS === '1';
  let browser;
  let context;

  try {
    browser = await chromium.launch({
      executablePath,
      headless,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(30_000);

    console.log(`profile: ${profile}`);
    console.log(`url: ${targetUrl.href}`);
    console.log(`browserExecutable: ${executablePath}`);
    console.log(`headless: ${headless}`);
    console.log('status: pending_manual_login');
    console.log('Open aVNC/noVNC and login manually. Then complete the job from MCP or SSH.');
    console.log('No cookie/session/token/password/storageState values will be printed.');

    await page.goto(targetUrl.href, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await exists(donePath)) {
        const title = await page.title().catch(() => '');
        const finalUrl = page.url();
        const targetHost = targetUrl.hostname.toLowerCase();
        const finalHost = sanitizeHost(finalUrl);
        const allowedDomains = uniq([targetHost, finalHost]);

        await context.storageState({ path: storageStatePath });

        await writeJson(metadataPath, {
          profile,
          captureMode: 'manual-login-pending-job',
          loginUrl: targetUrl.href,
          finalUrl,
          allowedDomains,
          allowedDomain: allowedDomains[0] || targetHost,
          createdAt: new Date().toISOString(),
          storageState: 'stored locally; value not printed',
          safety: 'No password, cookie, token, localStorage, sessionStorage, or storageState JSON was printed.',
        });

        await writeJson(statePath, {
          ok: true,
          status: 'completed',
          profile,
          url: targetUrl.href,
          title,
          finalUrl,
          allowedDomains,
          completedAt: new Date().toISOString(),
          storageStatePath: '.runtime/sessions/<profile>/storageState.json',
          metadataPath: '.runtime/sessions/<profile>/metadata.json',
          safety: 'Storage state saved locally only. Secret values were not printed.',
        });

        console.log(`title: ${title}`);
        console.log(`finalUrl: ${finalUrl}`);
        console.log(`allowedDomains: ${allowedDomains.join(', ')}`);
        console.log('PASS: manual login profile saved.');
        console.log('No cookie/session/token/password/storageState values were printed.');
        return;
      }

      await sleep(POLL_MS);
    }

    await writeJson(statePath, {
      ok: false,
      status: 'timeout',
      profile,
      url: targetUrl.href,
      timeoutMs: TIMEOUT_MS,
      endedAt: new Date().toISOString(),
      safety: 'Timed out before completion. Secret values were not printed.',
    });
    fail('manual login job timed out before completion.', 2);
  } catch (error) {
    await writeJson(statePath, {
      ok: false,
      status: 'failed',
      profile,
      url: targetUrl.href,
      error: error?.message || String(error),
      endedAt: new Date().toISOString(),
      safety: 'Failure output does not include cookie/session/token/password/storageState values.',
    });
    fail(`manual login worker failed: ${error?.message || String(error)}`, 3);
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

main();
