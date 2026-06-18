# S22 Mobile Job Radar Agent

A mobile-first web automation and MCP portfolio project running on a Samsung S22 using Termux, Node.js, SQLite, Express, MCP, and Debian proot Playwright.

This project explores whether an Android phone can act as a lightweight AI automation development environment, local tool server, and browser automation node.

## Project Goal

The goal of this project is to build a practical AI automation agent that runs from a Samsung S22 instead of a VPS or laptop.

It demonstrates how a phone can host:

- CLI automation
- HTTP API tools
- MCP tools
- SQLite-backed local memory
- Markdown report generation
- Browser inspection through Chromium and Playwright inside Debian proot

## Why Samsung S22?

This project is intentionally built on Samsung S22 through Termux.

Instead of using a VPS or laptop as the main runtime, the phone acts as the local development and execution environment.

This makes the project useful as a portfolio demonstration for:

- AI automation engineering
- MCP tool development
- Applied AI workflow prototyping
- Mobile Linux experimentation
- Browser automation with constrained hardware

## Current Features

- Scan a webpage URL from CLI
- Scan a webpage URL through HTTP API
- Normalize simple domain inputs such as `example.com` into `https://example.com/`
- Extract page title, description, headings, and links
- Save scan result into SQLite
- List saved scan records
- Show full scan detail by ID
- Delete unwanted scan records
- Generate markdown report from saved scan data
- Run an MCP server
- Expose scan/list/page/report functions as MCP tools
- Inspect browser-rendered pages through MCP using a Debian proot Playwright worker
- Track development progress using Git

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

## Architecture

Current working flow:

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

Browser inspection flow:

    MCP browser_inspect_url
              |
              v
    Debian proot Playwright worker on port 3002
              |
              v
    Chromium headless browser

The CLI and HTTP API share the same scanner module.

    CLI scan        -> src/scanner.js
    API POST /scan  -> src/scanner.js

The browser inspection tool uses a separate Playwright worker running inside Debian proot.

## CLI Usage

Install dependencies:

    npm install

Scan a webpage:

    node src/index.js scan https://example.com

Simple domain input is also supported:

    node src/index.js scan example.com

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

## Example CLI Flow

    node src/index.js scan example.com
    node src/index.js list
    node src/index.js show 1
    node src/index.js report 1

## HTTP API Server

The project includes an Express-based HTTP API server running inside Termux on the Samsung S22.

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

Simple domain input is also supported:

    curl -X POST http://localhost:3001/scan \
      -H "Content-Type: application/json" \
      -d '{"url":"example.com"}'

Example LAN access from PC:

    http://<S22-IP>:3001/health
    http://<S22-IP>:3001/pages

This confirms the S22 can act as a local network-accessible tool server.

## MCP Tools

The project includes an MCP server that exposes the scanner and browser inspection features as tools.

Tested MCP tools:

- `job_radar_scan`
- `job_radar_list_pages`
- `job_radar_get_page`
- `job_radar_get_report`
- `browser_inspect_url`

Start the MCP server:

    npm run mcp

Example MCP Inspector usage:

    npx @modelcontextprotocol/inspector npm run mcp

## Debian Proot Playwright Worker

Some websites require browser-rendered inspection instead of static HTML scanning.

For that case, the project uses a Debian proot worker running Chromium through Playwright.

Default worker port:

    3002

The proot Playwright setup is documented here:

    docs/proot-playwright.md

Worker source files are stored here:

    tools/proot-playwright-worker

## URL Normalization

The scanner supports simple domain input.

Example:

    example.com

is normalized to:

    https://example.com/

This works through:

- CLI
- HTTP API
- MCP tool calls

## Documentation

Additional project notes:

    docs/progress.md
    docs/portfolio-polish.md
    docs/proot-playwright.md

## Limitations

- Some websites may block simple HTTP requests with 403 Forbidden.
- The CLI and HTTP API scanner currently use static HTML extraction.
- JavaScript-heavy websites require the separate Debian proot Playwright worker.
- The browser worker must be started separately inside Debian proot.
- Termux or proot may slow down when the phone screen is off.
- The project is built for learning and portfolio demonstration, not production use.

## Roadmap

Planned improvements:

- Add architecture diagram image
- Add screenshots for GitHub demo
- Add `.env.example`
- Add license file
- Add sample scan output
- Add screenshot capture metadata from Playwright
- Improve classifier scoring notes
- Improve error handling for failed scans
- Save browser inspection result to database
- Add portfolio demo report export

## Portfolio Summary

Built a Samsung S22-hosted web automation and MCP prototype using Termux, Node.js, SQLite, Express, Debian proot, Chromium, and Playwright.

The system scans web pages, extracts structured page data, stores results locally, exposes results through CLI, HTTP API, and MCP tools, and generates markdown reports.

This demonstrates practical AI automation workflow development without relying on VPS infrastructure.
