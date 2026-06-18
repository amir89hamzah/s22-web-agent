# Proot Playwright Setup

This document explains how the S22 Web Agent runs browser inspection on Samsung S22 using Termux, Debian proot, Chromium, and Playwright.

## Problem

Native Playwright browser installation failed in Termux because the platform is Android.

Inside Debian proot, Node reports the platform as Linux. This allows playwright-core to control the system Chromium installed inside Debian.

## Current architecture

ChatGPT or MCP Inspector
  -> MCP server in Termux
  -> Proot Playwright worker on port 3002
  -> Chromium inside Debian proot

## Worker location

The worker source is stored in the project repo:

    tools/proot-playwright-worker

The worker runs inside Debian proot from this path:

    /data/data/com.termux/files/home/projects/s22-web-agent/tools/proot-playwright-worker

## Start the worker

From Termux:

    proot-distro login debian

Inside Debian proot:

    cd /data/data/com.termux/files/home/projects/s22-web-agent/tools/proot-playwright-worker
    npm install
    node server.mjs

Expected message:

    S22 proot Playwright worker running on http://127.0.0.1:3002

## Test the worker

From another Termux session:

    curl http://127.0.0.1:3002/health

Inspect example.com:

    curl "http://127.0.0.1:3002/inspect?url=https%3A%2F%2Fexample.com"

## MCP server connection

The MCP server uses this worker through:

    BROWSER_WORKER_URL=http://127.0.0.1:3002

Default value is already set in src/mcp-server.mjs.

## MCP Inspector from PC

Use SSH tunnel from PC to S22:

    ssh -L 6274:127.0.0.1:6274 -L 6277:127.0.0.1:6277 u0_a328@192.168.100.178 -p 8022

Then open this in the PC browser:

    http://localhost:6274

Do not open the S22 IP directly for MCP Inspector.

## Tested

The browser_inspect_url MCP tool has been tested successfully with:

    https://example.com
    https://google.com

## Notes

For longer testing sessions on Android, Termux or proot may slow down when the phone screen is off.

Useful command:

    termux-wake-lock

Release it later with:

    termux-wake-unlock
