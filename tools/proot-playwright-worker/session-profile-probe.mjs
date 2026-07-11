#!/usr/bin/env node

import { chromium } from 'playwright';
import process from 'node:process';
import {
  PROFILE_STATES,
  exitCodeForState,
  inspectProfile,
  safeUrlForDisplay,
  sanitizeErrorMessage,
} from '../session-profile-common.mjs';

function getChromiumLaunchArgs() {
  const defaults = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  const extra = String(process.env.CHROMIUM_FLAGS || '')
    .split(/\s+/)
    .map((flag) => flag.trim())
    .filter(Boolean);

  return [...new Set([...defaults, ...extra])];
}

function printBase(result) {
  console.log(`state: ${result.state}`);
  console.log(`profile: ${result.profile || '(none)'}`);
  if (result.targetDisplayUrl) console.log(`targetUrl: ${result.targetDisplayUrl}`);
  if (result.targetHost) console.log(`targetHost: ${result.targetHost}`);
  if (Array.isArray(result.allowedDomains)) {
    console.log(`allowedDomains: ${result.allowedDomains.join(', ') || '(none)'}`);
  }
  if (result.reason) console.log(`reason: ${result.reason}`);
  if (result.message) console.log(`message: ${result.message}`);
}

function finish(result) {
  printBase(result);

  if (result.title !== undefined) console.log(`title: ${result.title}`);
  if (result.finalDisplayUrl) console.log(`finalUrl: ${result.finalDisplayUrl}`);
  if (result.expectedTextStatus) console.log(`expectedText: ${result.expectedTextStatus}`);

  if (result.state === PROFILE_STATES.VALID) {
    console.log('PASS: authenticated profile probe completed.');
  } else if (result.state === PROFILE_STATES.EXPIRED_OR_LOGGED_OUT) {
    console.log('FAIL-SAFE: authenticated marker was not found.');
    console.log('The session may be expired/logged out, or the target page content may have changed.');
  } else if (result.state === PROFILE_STATES.MISSING) {
    console.log('next: create or refresh the profile through a human-controlled local manual login.');
  } else if (result.state === PROFILE_STATES.DOMAIN_MISMATCH) {
    console.log('next: use a profile captured for this domain or choose the correct profile.');
  }

  console.log('Page text excerpt: suppressed by design.');
  console.log('No cookie/session/token/password/MFA/storageState values were printed.');
  process.exitCode = exitCodeForState(result.state);
}

async function main() {
  const [profile, rawTargetUrl, expectedText = ''] = process.argv.slice(2);

  if (!profile || !rawTargetUrl || !expectedText) {
    finish({
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'probe_arguments_required',
      message: 'usage: node tools/proot-playwright-worker/session-profile-probe.mjs <profile> <url> <expectedText>',
      profile: profile || '',
    });
    return;
  }

  const repoRoot = process.env.SESSION_REPO_ROOT || process.cwd();
  const inspected = await inspectProfile({ repoRoot, profile, rawTargetUrl });

  if (inspected.state !== PROFILE_STATES.PRESENT_UNVERIFIED) {
    finish(inspected);
    return;
  }

  const executablePath = process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium';
  const launchArgs = getChromiumLaunchArgs();

  let browser;
  let context;

  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: launchArgs,
    });

    context = await browser.newContext({ storageState: inspected.storageStatePath });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(Number(process.env.SESSION_PROBE_NAV_TIMEOUT_MS || 30_000));
    page.setDefaultTimeout(Number(process.env.SESSION_PROBE_ACTION_TIMEOUT_MS || 15_000));

    await page.goto(inspected.targetUrl.href, {
      waitUntil: 'domcontentloaded',
      timeout: Number(process.env.SESSION_PROBE_NAV_TIMEOUT_MS || 30_000),
    });

    const title = await page.title().catch(() => '');
    const finalUrl = page.url();
    const bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(async () => {
      return (await page.textContent('body')) ?? '';
    });

    const found = String(bodyText).includes(expectedText);

    finish({
      ...inspected,
      state: found ? PROFILE_STATES.VALID : PROFILE_STATES.EXPIRED_OR_LOGGED_OUT,
      reason: found ? 'authenticated_marker_found' : 'authenticated_marker_missing',
      message: found
        ? 'expected authenticated text was found'
        : 'expected authenticated text was not found',
      title,
      finalDisplayUrl: safeUrlForDisplay(finalUrl),
      expectedTextStatus: found ? 'found' : 'not_found',
    });
  } catch (error) {
    finish({
      ...inspected,
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'profile_probe_failed',
      message: sanitizeErrorMessage(error?.message || error?.name || 'unknown error'),
    });
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  finish({
    state: PROFILE_STATES.RUNTIME_ERROR,
    reason: 'unhandled_probe_error',
    message: sanitizeErrorMessage(error?.message || error?.name || 'unknown error'),
    profile: process.argv[2] || '',
  });
});
