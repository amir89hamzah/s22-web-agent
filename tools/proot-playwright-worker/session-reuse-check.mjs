#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const [profile, url, expectedText] = argv;
  return { profile, url, expectedText };
}

function assertSafeProfile(profile) {
  if (!profile || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(profile)) {
    throw new Error('Invalid profile name. Use letters, numbers, dot, underscore, or dash. No slashes or spaces.');
  }
}

function normalizeUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http/https URLs are allowed.');
  }
  return url;
}

function loadMetadata(sessionDir) {
  const metaPath = path.join(sessionDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

function assertDomainAllowed(url, metadata) {
  const host = url.hostname.toLowerCase();
  const allowed = (metadata?.allowedDomain || host).toLowerCase();

  if (host !== allowed && !host.endsWith(`.${allowed}`)) {
    throw new Error(`URL host ${host} is outside allowed domain ${allowed}.`);
  }

  return allowed;
}

function compactText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function main() {
  const { profile, url: rawUrl, expectedText } = parseArgs(process.argv.slice(2));

  if (!profile || !rawUrl) {
    console.error('Usage: node tools/proot-playwright-worker/session-reuse-check.mjs <profile> <url> [expectedText]');
    process.exit(2);
  }

  assertSafeProfile(profile);
  const url = normalizeUrl(rawUrl);

  const repoRoot = process.cwd();
  const sessionDir = path.join(repoRoot, '.runtime', 'sessions', profile);
  const statePath = path.join(sessionDir, 'storageState.json');

  if (!fs.existsSync(statePath)) {
    throw new Error(`storageState not found for profile: ${profile}`);
  }

  const metadata = loadMetadata(sessionDir);
  const allowedDomain = assertDomainAllowed(url, metadata);

  console.log('== Session Reuse Check ==');
  console.log(`profile: ${profile}`);
  console.log(`url: ${url.toString()}`);
  console.log(`allowedDomain: ${allowedDomain}`);
  console.log('storageState: present');
  console.log('Secret values are not displayed.');
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();

  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });

  const title = await page.title();
  const finalUrl = page.url();
  const bodyText = compactText(await page.locator('body').innerText({ timeout: 10000 }));
  const excerpt = bodyText.slice(0, 700);

  console.log(`title: ${title}`);
  console.log(`finalUrl: ${finalUrl}`);
  console.log('');
  console.log('== Page text excerpt ==');
  console.log(excerpt);
  console.log('');

  if (expectedText) {
    if (!bodyText.includes(expectedText)) {
      throw new Error(`Expected text not found: ${expectedText}`);
    }
    console.log(`PASS: expected text found: ${expectedText}`);
  } else {
    console.log('PASS: page loaded with stored session profile.');
  }

  await browser.close();
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
