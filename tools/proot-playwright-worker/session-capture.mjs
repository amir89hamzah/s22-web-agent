#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--profile') out.profile = argv[++i];
    else if (item === '--url') out.url = argv[++i];
    else if (item === '--domain') out.domain = argv[++i];
    else if (item === '--help' || item === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${item}`);
  }
  return out;
}

function usage() {
  console.log(`Usage:
  node tools/proot-playwright-worker/session-capture.mjs --profile <safe-name> --url <https-url> [--domain example.com]

Safety:
  - This opens visible Chromium on DISPLAY, usually :1.
  - Login manually through local VNC only.
  - Press Enter in this terminal when ready to save storageState.
  - The script never prints cookies, tokens, or storageState contents.`);
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

function assertDomainAllowed(url, domain) {
  const host = url.hostname.toLowerCase();
  const allowed = (domain || host).toLowerCase();
  if (host !== allowed && !host.endsWith(`.${allowed}`)) {
    throw new Error(`URL host ${host} is outside allowed domain ${allowed}.`);
  }
  return allowed;
}

function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  assertSafeProfile(args.profile);
  const url = normalizeUrl(args.url || 'https://example.com/');
  const allowedDomain = assertDomainAllowed(url, args.domain);

  const display = process.env.DISPLAY || '';
  if (!display) {
    throw new Error('DISPLAY is not set. Start local VNC first and run with DISPLAY=:1.');
  }

  const repoRoot = process.cwd();
  const sessionDir = path.join(repoRoot, '.runtime', 'sessions', args.profile);
  const statePath = path.join(sessionDir, 'storageState.json');
  const metaPath = path.join(sessionDir, 'metadata.json');

  fs.mkdirSync(sessionDir, { recursive: true });

  console.log('== Session Capture Mode ==');
  console.log(`profile: ${args.profile}`);
  console.log(`url: ${url.toString()}`);
  console.log(`allowedDomain: ${allowedDomain}`);
  console.log(`display: ${display}`);
  console.log(`output: ${statePath}`);
  console.log('');
  console.log('Safety reminder: do not paste passwords, cookies, tokens, or storageState into ChatGPT.');
  console.log('Use local VNC on S22 only. Press Enter here only after the page is ready for capture.');
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('Visible Chromium is open in VNC.');
  console.log('For this first proof, example.com is enough. For future real sites, login manually in VNC first.');
  await question('Press Enter to save Playwright storageState and close Chromium... ');

  await context.storageState({ path: statePath });

  const metadata = {
    profile: args.profile,
    allowedDomain,
    url: url.toString(),
    storageStatePath: `.runtime/sessions/${args.profile}/storageState.json`,
    createdBy: 'manual-vnc-session-capture',
    createdAt: new Date().toISOString(),
    notes: 'Do not commit. Do not paste storageState, cookies, tokens, or passwords into ChatGPT.',
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n', 'utf8');

  const stat = fs.statSync(statePath);
  console.log('');
  console.log('PASS: storageState saved.');
  console.log(`profile: ${args.profile}`);
  console.log(`storageState bytes: ${stat.size}`);
  console.log('No cookie/session values were printed.');

  await browser.close();
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
