# S22 Mobile Job Radar Agent

A mobile-first web automation and information extraction prototype running on Samsung S22 using Termux, Node.js, SQLite, and Git.

This project explores whether an Android phone can act as a lightweight AI automation development environment and local automation node.

## Current Features

- Scan a webpage URL from CLI
- Scan a webpage URL through HTTP API
- Extract page title, description, headings, and links
- Save scan result into SQLite
- List saved scan records
- Show full scan detail by ID
- Delete unwanted scan records
- Generate markdown report from saved scan data
- Run an MCP server skeleton
- Inspect browser-rendered pages through MCP using a Debian proot Playwright worker
- Track development progress using Git

## Why Samsung S22?

This project is intentionally built on Samsung S22 through Termux.

Instead of using a VPS or laptop as the main runtime, the phone acts as the local development and execution environment.

## Tech Stack

- Samsung S22
- Termux
- Debian proot
- Node.js
- npm
- Cheerio
- Express
- SQLite
- MCP SDK
- playwright-core
- Chromium
- Git

## Commands

Install dependencies:

    npm install

Scan a webpage:

    node src/index.js scan https://example.com

List saved scans:

    node src/index.js list

Show scan detail:

    node src/index.js show 1

Delete scan record:

    node src/index.js delete 1

Generate markdown report:

    node src/index.js report 1

Show help:

    node src/index.js help

## Example Flow

    node src/index.js scan https://example.com
    node src/index.js list
    node src/index.js show 1
    node src/index.js report 1

## Project Direction

This project is evolving into a mobile-hosted AI automation agent with:

- CLI workflow
- HTTP API workflow
- SQLite-backed memory
- Markdown report generation
- MCP tool layer
- Browser inspection through Debian proot, Chromium, and Playwright
- Future AI summarization
- Optional Flowise or n8n integration

## Limitations

- Some websites may block simple HTTP requests with 403 Forbidden.
- The CLI and HTTP API scanner currently use static HTML extraction.
- JavaScript-heavy websites require the separate Debian proot Playwright worker.
- The browser worker must be started separately inside Debian proot.
- Termux or proot may slow down when the phone screen is off.
- The project is built for learning and portfolio demonstration, not production use.

## Portfolio Summary

Built a Samsung S22-hosted web automation prototype using Termux, Node.js, SQLite, and Git. The system scans web pages, extracts structured page data, stores results locally, and generates markdown reports, demonstrating mobile-first AI automation workflow development without relying on VPS infrastructure.

## HTTP API Server

The project now includes an Express-based HTTP API server running inside Termux on the Samsung S22.

Start the server:

    npm run server

Default API port:

    3001

Available endpoints:

    GET  /health
    GET  /pages
    GET  /pages/:id
    POST /scan
    GET  /report/:id

Example health check:

    curl http://localhost:3001/health

Example scan request:

    curl -X POST http://localhost:3001/scan \
      -H "Content-Type: application/json" \
      -d '{"url":"https://example.com"}'

Example LAN access from PC:

    http://<S22-IP>:3001/health
    http://<S22-IP>:3001/pages

This confirms the S22 can act as a local network-accessible tool server.

## Current Architecture Update

Current working flow:

    CLI scan                 -> src/scanner.js
    API POST /scan           -> src/scanner.js
    MCP browser_inspect_url  -> Debian proot Playwright worker -> Chromium

This means the CLI and HTTP API share the same scanner module, while the MCP browser inspection tool uses a separate Playwright worker running inside Debian proot.

The proot Playwright setup is documented here:

    docs/proot-playwright.md

Worker source files are stored here:

    tools/proot-playwright-worker

Future MCP tools may expose scan, list, show, and report functions.

