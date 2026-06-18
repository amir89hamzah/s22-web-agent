import express from 'express';
import { chromium } from 'playwright-core';

const app = express();
const PORT = process.env.PORT || 3002;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 's22-proot-playwright-worker',
    chromiumPath: CHROMIUM_PATH,
    runtime: {
      platform: process.platform,
      arch: process.arch,
      node: process.version
    }
  });
});

app.get('/inspect', async (req, res) => {
  const url = String(req.query.url || '').trim();

  if (!url) {
    return res.status(400).json({
      ok: false,
      error: 'Missing url query parameter'
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({
      ok: false,
      error: 'Invalid URL'
    });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({
      ok: false,
      error: 'Only http and https URLs are allowed'
    });
  }

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: CHROMIUM_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const result = await page.evaluate(() => ({
      title: document.title || '',
      h1: document.querySelector('h1')?.textContent?.trim() || null,
      headings: Array.from(document.querySelectorAll('h1,h2,h3'))
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .slice(0, 30),
      links: Array.from(document.querySelectorAll('a[href]'))
        .map((a) => ({
          text: a.textContent?.trim() || '',
          href: a.href
        }))
        .filter((link) => link.href)
        .slice(0, 50),
      textSample: document.body?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 1000) || ''
    }));

    res.json({
      ok: true,
      url,
      chromiumPath: CHROMIUM_PATH,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      url,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`S22 proot Playwright worker running on http://127.0.0.1:${PORT}`);
});
