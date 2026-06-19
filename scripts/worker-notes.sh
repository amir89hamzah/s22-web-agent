#!/data/data/com.termux/files/usr/bin/bash

cat <<'NOTES'
Playwright Worker Notes

The Playwright worker runs inside Debian proot, not directly in Termux.

Terminal 1: start the S22 Web Agent API

  cd ~/projects/mobile-job-radar-agent
  npm run api:start

Terminal 2: start Debian proot worker

  proot-distro login debian

Inside Debian proot:

  cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent/tools/proot-playwright-worker
  node server.mjs

Expected worker message:

  S22 proot Playwright worker running on http://127.0.0.1:3002

Terminal 3: check worker status from Termux

  cd ~/projects/mobile-job-radar-agent
  npm run worker:status

Useful test:

  curl http://127.0.0.1:3002/health

MCP tools that use the worker:

  browser_inspect_url
  browser_scan_url
NOTES
