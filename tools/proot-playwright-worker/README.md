# Proot Playwright Worker

This worker runs inside Debian proot on Termux because native Playwright browser installation does not work on Android/Termux directly.

## Environment

- Host device: Samsung S22 + Termux
- Proot distro: Debian 13 trixie
- Node inside proot reports: process.platform = linux
- Chromium path: /usr/bin/chromium
- Worker URL: http://127.0.0.1:3002

## Endpoints

Health check:

    curl http://127.0.0.1:3002/health

Inspect URL:

    curl "http://127.0.0.1:3002/inspect?url=https%3A%2F%2Fexample.com"

The worker returns JSON containing ok, url, chromiumPath, title, h1, headings, links, and textSample.

## Start worker from repo copy

From Termux:

    proot-distro login debian

Inside Debian proot:

    cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent/tools/proot-playwright-worker
    npm install
    node server.mjs

The MCP server uses this worker through:

    BROWSER_WORKER_URL=http://127.0.0.1:3002
