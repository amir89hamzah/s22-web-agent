import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const SAFE_PROFILE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const DEFAULT_EXCERPT_LENGTH = 700;
const MIN_EXCERPT_LENGTH = 80;
const MAX_EXCERPT_LENGTH = 2000; const SUPPRESS_TEXT_EXCERPT = process.env.SESSION_SCAN_SUPPRESS_EXCERPT === '1';

function fail(message, code = 1) {
  console.error(`FAIL: ${message}`);
  process.exit(code);
}

function usage() {
  console.error('Usage: node tools/proot-playwright-worker/session-profile-scan.mjs <profile> <url> [expectedText] [maxExcerptLength]');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} is missing or invalid JSON: ${error.message}`);
  }
}

function normalizeAllowedDomain(value) {
  if (typeof value !== 'string') return '';

  const raw = value.trim().toLowerCase();
  if (!raw) return '';

  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    // Accept metadata values such as "127.0.0.1", "127.0.0.1:3107", or "example.com/path".
    return raw
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .trim()
      .toLowerCase();
  }
}

function getAllowedDomains(metadata) {
  const values = [];

  if (Array.isArray(metadata.allowedDomains)) values.push(...metadata.allowedDomains);
  if (Array.isArray(metadata.allowed_domains)) values.push(...metadata.allowed_domains);
  if (metadata.allowedDomain) values.push(metadata.allowedDomain);
  if (metadata.allowed_domain) values.push(metadata.allowed_domain);

  return [...new Set(values.map(normalizeAllowedDomain).filter(Boolean))];
}

function clampExcerptLength(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_EXCERPT_LENGTH), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_EXCERPT_LENGTH;
  return Math.min(MAX_EXCERPT_LENGTH, Math.max(MIN_EXCERPT_LENGTH, parsed));
}

function makeExcerpt(text, maxLength) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '(empty body text)';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

async function main() {
  const [profile, rawTargetUrl, expectedText = '', rawMaxExcerptLength] = process.argv.slice(2);

  if (!profile || !rawTargetUrl) {
    usage();
    fail('profile and url are required.');
  }

  if (!SAFE_PROFILE_RE.test(profile)) {
    fail('profile invalid. Use only letters, numbers, dot, underscore, and dash; max 64 chars; first char must be alphanumeric.');
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawTargetUrl);
  } catch {
    fail(`target URL is invalid: ${rawTargetUrl}`);
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    fail('target URL must use http or https.');
  }

  const repoRoot = process.cwd();
  const sessionDir = path.join(repoRoot, '.runtime', 'sessions', profile);
  const storageStatePath = path.join(sessionDir, 'storageState.json');
  const metadataPath = path.join(sessionDir, 'metadata.json');

  if (!(await fileExists(storageStatePath))) {
    fail(`storageState missing for profile: ${profile}`);
  }

  if (!(await fileExists(metadataPath))) {
    fail(`metadata missing for profile: ${profile}`);
  }

  const metadata = await readJson(metadataPath, 'metadata');
  const allowedDomains = getAllowedDomains(metadata);
  const targetHost = targetUrl.hostname.toLowerCase();
  const matchedAllowedDomain = allowedDomains.find((domain) => domain === targetHost);

  if (!matchedAllowedDomain) {
    const allowedForDisplay = allowedDomains.length ? allowedDomains.join(', ') : '(none)';
    fail(`metadata domain mismatch. targetHost=${targetHost}; allowedDomain=${allowedForDisplay}`);
  }

  const maxExcerptLength = clampExcerptLength(rawMaxExcerptLength);
  let browser;

  try {
    const executablePath = process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium';

    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(30_000);
    page.setDefaultTimeout(15_000);

    await page.goto(targetUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const title = await page.title();
    const finalUrl = page.url();
    const bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(async () => {
      return (await page.textContent('body')) ?? '';
    });
    const excerpt = makeExcerpt(bodyText, maxExcerptLength);

    console.log(`profile: ${profile}`);
    console.log(`url: ${targetUrl.href}`);
    console.log(`allowedDomain: ${matchedAllowedDomain}`);
    console.log(`browserExecutable: ${executablePath}`);
    console.log(`title: ${title}`);
    console.log(`finalUrl: ${finalUrl}`);
    if (SUPPRESS_TEXT_EXCERPT) {
    console.log('textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)');
  } else {
    console.log('textExcerpt:');
    console.log(excerpt);
  }

    if (expectedText && !String(bodyText).includes(expectedText)) {
      fail('expected text was not found in page body.');
    }

    if (expectedText) {
      console.log('expectedText: found');
    }

    console.log('PASS: profile-aware headless scan completed.');
    console.log('No cookie/session values were printed.');

    await context.close();
  } catch (error) {
    fail(`page scan failed: ${error.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

main();
