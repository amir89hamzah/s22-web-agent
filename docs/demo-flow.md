# Demo Flow

This document describes the recommended demo flow for the S22 Mobile Job Radar Agent.

## Demo Goal

Show that a Samsung S22 can act as a local AI automation node that supports:

- CLI scanning
- HTTP API access
- MCP tool calls
- Browser inspection through Debian proot Playwright
- SQLite-backed storage
- Markdown report generation

## High-Level Architecture

    ChatGPT / MCP Inspector
              |
              v
    MCP Server on Samsung S22
              |
              v
    HTTP API Server on port 3001
              |
              v
    Scanner + SQLite database

Browser-rendered inspection uses a separate worker:

    MCP browser_inspect_url
              |
              v
    Debian proot Playwright worker on port 3002
              |
              v
    Chromium headless browser

## Demo 1: CLI Scan

Run:

    node src/index.js scan example.com

Expected result:

- URL is normalized to `https://example.com/`
- Page title is extracted
- Scan result is saved into SQLite

Then run:

    node src/index.js list
    node src/index.js show 1
    node src/index.js report 1

## Demo 2: HTTP API

Start the API server:

    npm run server

Check health:

    curl http://localhost:3001/health

Scan a URL:

    curl -X POST http://localhost:3001/scan \
      -H "Content-Type: application/json" \
      -d '{"url":"example.com"}'

List saved pages:

    curl http://localhost:3001/pages

## Demo 3: MCP Inspector

Start MCP Inspector:

    npx @modelcontextprotocol/inspector npm run mcp

Test these tools:

- `job_radar_scan`
- `job_radar_list_pages`
- `job_radar_get_page`
- `job_radar_get_report`

Recommended test input:

    {
      "url": "example.com"
    }

Expected result:

- Tool call succeeds
- URL is normalized
- Result is stored
- Report can be retrieved

## Demo 4: Browser Inspection

Start the Debian proot Playwright worker on port `3002`.

Then test MCP tool:

- `browser_inspect_url`

Recommended test input:

    {
      "url": "https://example.com"
    }

Expected result:

- Chromium opens the page inside Debian proot
- Page title, headings, links, and text sample are returned

## Demo Talking Points

This project demonstrates:

- Building an AI automation tool server on Android
- Connecting CLI, HTTP API, MCP, SQLite, and Playwright
- Using a phone as a lightweight local automation node
- Working around Termux browser automation limitations using Debian proot
- Creating a portfolio project that shows practical AI workflow engineering

## Current Limitations

- ChatGPT remote MCP connection may require HTTP MCP transport or secure tunnel setup.
- Static scanner may fail on websites that block simple HTTP requests.
- JavaScript-heavy websites require the Playwright worker.
- Worker and API server must be started separately.
- This is a portfolio and learning project, not production infrastructure.
