# S22 Web Agent

A mobile-first web automation and MCP portfolio project running on a Samsung S22 using Termux, Node.js, SQLite, Express, MCP, Cloudflare Tunnel, and Debian proot Playwright.

This project explores whether an Android phone can act as a lightweight AI automation development environment, local tool server, MCP server, and browser automation node.

## Portfolio Summary

S22 Web Agent demonstrates a practical AI automation stack running from a phone instead of a VPS or laptop.

It includes:

- CLI webpage scanning
- Local HTTP API tools
- MCP tools over stdio
- MCP Streamable HTTP endpoint
- Optional bearer-token protection for remote MCP access
- SQLite-backed local scan history
- Markdown report generation
- Browser-rendered inspection through Chromium and Playwright inside Debian proot
- Public Route A access through Cloudflare Named Tunnel
- OpenAI Secure MCP Tunnel private ChatGPT Custom App integration

The project is designed as a learning and portfolio project for AI automation engineering, MCP tool development, applied AI workflow prototyping, and constrained-device automation.

## Why Samsung S22?

This project is intentionally built on a Samsung S22 through Termux.

Instead of using a VPS or laptop as the main runtime, the phone acts as the local development and execution environment.

This makes the project useful as a portfolio demonstration for:

- AI automation engineering
- MCP tool development
- Applied AI workflow prototyping
- Mobile Linux experimentation
- Browser automation with constrained hardware
- Secure public tool access using a tunnel-first architecture

## Current Features

- Scan a webpage URL from CLI
- Scan a webpage URL through HTTP API
- Normalize simple domain inputs such as `example.com` into `https://example.com/`
- Extract page title, description, headings, and links
- Save scan results into SQLite
- List saved scan records
- Show full scan detail by ID
- Delete unwanted scan records
- Generate Markdown report from saved scan data
- Run an MCP server over stdio
- Run an MCP Streamable HTTP server on port `3003`
- Expose scanner/list/page/report functions as MCP tools
- Inspect browser-rendered pages through MCP using a Debian proot Playwright worker
- Persist browser inspection scan outputs
- Protect public MCP access with optional bearer token authentication
- Expose the MCP HTTP server publicly through Cloudflare Named Tunnel
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
- Cloudflare Tunnel
- Git

## Architecture

### Local CLI and API Flow

```text
CLI command / HTTP API request
          |
          v
Scanner module
          |
          v
SQLite database + Markdown reports
```

The CLI and HTTP API share the same scanner module.

```text
CLI scan        -> src/scanner.js
API POST /scan  -> src/scanner.js
```

### Local MCP Flow

```text
ChatGPT / MCP Inspector
          |
          v
MCP server on Samsung S22
          |
          v
HTTP API server on port 3001
          |
          v
Scanner + SQLite database
```

### Browser Inspection Flow

```text
MCP browser tool
          |
          v
Debian proot Playwright worker on port 3002
          |
          v
Chromium headless browser
```

The browser inspection tool uses a separate Playwright worker running inside Debian proot.

### Route A Public MCP Flow

```text
Remote MCP client
          |
          v
https://s22agent.aidesk.rest/mcp
          |
          v
Cloudflare Named Tunnel
          |
          v
Samsung S22 MCP HTTP server on 127.0.0.1:3003/mcp
```

Route A exposes only the MCP HTTP server on port `3003`.

The local HTTP API on port `3001` and the Debian proot Playwright worker on port `3002` are not exposed publicly.

## Security Boundary

Route A follows a strict security boundary:

- Public access is allowed only through the MCP HTTP endpoint on port `3003`.
- The local API server on port `3001` must remain local-only.
- The Playwright worker on port `3002` must remain local-only.
- `MCP_HTTP_TOKEN` is created locally and must not be committed or shared.
- `CLOUDFLARE_TUNNEL_TOKEN` comes from Cloudflare and must not be committed or shared.
- Public MCP access should use bearer authentication.

Expected public no-token behavior:

```text
401 Unauthorized
```

This confirms that the public MCP endpoint requires authentication when `MCP_HTTP_TOKEN` is enabled.

## Route A Status

Route A Named Tunnel live testing has passed.

Verified checks:

- Public no-token request returned `401`
- MCP `initialize` returned `200`
- MCP `notifications/initialized` returned `202`
- MCP `tools/list` returned `200`
- `job_radar_health` returned `ok: true`
- `job_radar_scan` with `example.com` returned `ok: true`

MCP Inspector testing over the public endpoint is optional because curl-based MCP proof has already verified the core Route A flow.


## OpenAI Secure MCP Tunnel Mode

The project also supports a private ChatGPT Custom App integration through OpenAI Secure MCP Tunnel.

This mode is separate from Route A Cloudflare public tunnel mode.

Flow:

```text
ChatGPT Custom App
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client inside Debian proot
  -> Termux MCP HTTP on 127.0.0.1:3003/mcp
  -> Termux API on 127.0.0.1:3001
  -> SQLite/report files
```

Start local Termux services:

```bash
npm run openai:tunnel:start
```

Start the tunnel client inside Debian proot:

```bash
proot-distro login debian
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
npm run openai:tunnel:client:debian
```

The Debian helper prompts for the OpenAI runtime API key if `CONTROL_PLANE_API_KEY` is not already set.

The key is not stored in the repository.

Check status:

```bash
npm run openai:tunnel:status
```

Stop runtime:

```bash
npm run openai:tunnel:stop
```

Phase 6 helper testing passed through ChatGPT Custom App with health, list saved pages, scan `example.com`, scan `www.exactautomation.com.my`, and health-after-scan checks.

Detailed notes:

```text
docs/openai-secure-mcp-tunnel-test.md
docs/openai-secure-mcp-tunnel-operator-runbook.md
docs/openai-secure-mcp-tunnel-helper-test-results.md
```

## CLI Usage

Install dependencies:

```bash
npm install
```

Scan a webpage:

```bash
node src/index.js scan https://example.com
```

Simple domain input is also supported:

```bash
node src/index.js scan example.com
```

List saved scans:

```bash
node src/index.js list
```

Show scan detail:

```bash
node src/index.js show 1
```

Delete scan record:

```bash
node src/index.js delete 1
```

Generate Markdown report:

```bash
node src/index.js report 1
```

Show help:

```bash
node src/index.js help
```

## Example CLI Flow

```bash
node src/index.js scan example.com
node src/index.js list
node src/index.js show 1
node src/index.js report 1
```

## HTTP API Server

The project includes an Express-based HTTP API server running inside Termux on the Samsung S22.

Start the local API server:

```bash
npm run server
```

Default API port:

```text
3001
```

Available endpoints:

```text
GET  /health
GET  /pages
GET  /pages/:id
POST /scan
GET  /report/:id
```

Example health check:

```bash
curl http://localhost:3001/health
```

Example scan request:

```bash
curl -X POST http://localhost:3001/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

Simple domain input is also supported:

```bash
curl -X POST http://localhost:3001/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"example.com"}'
```

Example LAN access from PC:

```text
http://<S22-IP>:3001/health
http://<S22-IP>:3001/pages
```

This confirms the S22 can act as a local network-accessible tool server.

## MCP Tools

The project includes MCP servers that expose the scanner and browser inspection features as tools.

Main MCP tools include:

- `job_radar_health`
- `job_radar_scan`
- `job_radar_list_pages`
- `job_radar_get_page`
- `job_radar_get_report`
- `browser_inspect_url`
- `browser_scan_url`

Start the stdio MCP server:

```bash
npm run mcp
```

Example MCP Inspector usage for stdio mode:

```bash
npx @modelcontextprotocol/inspector npm run mcp
```

## MCP Streamable HTTP Server

The project also supports MCP over Streamable HTTP.

Default MCP HTTP endpoint:

```text
http://127.0.0.1:3003/mcp
```

Start the MCP HTTP server:

```bash
npm run mcp:http:start
```

Check MCP HTTP server status:

```bash
npm run mcp:http:status
```

Stop the MCP HTTP server:

```bash
npm run mcp:http:stop
```

## Route A Runtime Helpers

Route A uses helper scripts to start and stop the public MCP setup safely.

Start Route A:

```bash
npm run route:a:start
```

Check Route A status:

```bash
npm run route:a:status
```

Stop Route A:

```bash
npm run route:a:stop
```

Route A is designed to expose only:

```text
127.0.0.1:3003/mcp
```

Never expose these ports publicly:

```text
3001  HTTP API server
3002  Playwright worker
```

## Debian Proot Playwright Worker

Some websites require browser-rendered inspection instead of static HTML scanning.

For that case, the project uses a Debian proot worker running Chromium through Playwright.

Default worker port:

```text
3002
```

The proot Playwright setup is documented here:

```text
docs/proot-playwright.md
```

Worker source files are stored here:

```text
tools/proot-playwright-worker
```

## URL Normalization

The scanner supports simple domain input.

Example:

```text
example.com
```

is normalized to:

```text
https://example.com/
```

This works through:

- CLI
- HTTP API
- MCP tool calls


## LLM Repo Index

For AI-assisted repo navigation, see:

```text
llm-index.yaml
```

This file summarizes runtime modes, important files, helper scripts, security boundaries, and the recommended next phase without storing secrets.

## Documentation

Additional project notes:

```text
docs/progress.md
docs/portfolio-polish.md
docs/proot-playwright.md
docs/mcp-http-auth.md
docs/run-public-tunnel-demo.md
docs/route-a-named-tunnel.md
docs/route-a-live-test-results.md
docs/route-a-operator-runbook.md
```

## Sample Outputs

Sample output and screenshots are stored in:

```text
samples/
screenshots/
```

Generated runtime data is intentionally ignored by Git:

```text
data/
reports/
.runtime/
```

## Limitations

- Some websites may block simple HTTP requests with `403 Forbidden`.
- The CLI and HTTP API scanner currently use static HTML extraction.
- JavaScript-heavy websites require the separate Debian proot Playwright worker.
- The browser worker must be started separately inside Debian proot.
- Termux or proot may slow down when the phone screen is off.
- Public Route A access depends on the local phone runtime, MCP HTTP server, and Cloudflare tunnel being active.
- The project is built for learning and portfolio demonstration, not production use.

## Roadmap

Planned improvements:

- Add architecture diagram image
- Add more GitHub screenshots
- Add a short demo GIF or video link
- Add more browser inspection examples
- Add safer automated smoke tests for Route A
- Improve README with final demo section after more public testing
