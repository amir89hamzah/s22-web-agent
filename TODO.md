# S22 Web Agent - Task List

This file tracks the current engineering roadmap for the S22 Web Agent portfolio project.

The project started as a mobile job radar scanner and has evolved into a Samsung S22-hosted MCP/web automation agent.

## Current Status

Completed core capabilities:

- [x] Run Node.js project on Samsung S22 through Termux
- [x] Store scanned pages in SQLite
- [x] Generate JSON and Markdown reports
- [x] Provide CLI commands for scan, list, show, delete, report, and help
- [x] Provide HTTP API server on local port `3001`
- [x] Provide MCP stdio server
- [x] Provide MCP Streamable HTTP server on local port `3003`
- [x] Provide browser-rendered inspection through Debian proot Playwright worker on local port `3002`
- [x] Provide Route A public MCP mode through Cloudflare Named Tunnel
- [x] Provide OpenAI Secure MCP Tunnel mode for private ChatGPT Custom App integration
- [x] Add operator helper scripts for Route A
- [x] Add operator helper scripts for OpenAI Secure MCP Tunnel mode
- [x] Document successful Route A live test
- [x] Document successful OpenAI Secure MCP Tunnel test
- [x] Document successful OpenAI Secure MCP Tunnel helper test

## Operating Modes

### Local CLI/API Mode

- [x] CLI scan through `node src/index.js scan <url>`
- [x] Local API health through `GET /health`
- [x] Local API scan through `POST /scan`
- [x] Local page list through `GET /pages`
- [x] Local report read through `GET /report/:id`

### MCP Local Mode

- [x] MCP stdio server
- [x] MCP Streamable HTTP server
- [x] Stateful MCP HTTP sessions
- [x] Optional MCP HTTP bearer token for local/LAN/Route A testing
- [x] Shared MCP tools through `src/mcp-core.mjs`

### Route A Cloudflare Mode

- [x] Cloudflare Named Tunnel setup
- [x] Public hostname: `s22agent.aidesk.rest`
- [x] Public MCP endpoint: `https://s22agent.aidesk.rest/mcp`
- [x] Expose only MCP HTTP port `3003`
- [x] Keep API port `3001` private
- [x] Keep Playwright worker port `3002` private
- [x] Add Route A start/status/stop helpers
- [x] Document Route A operator runbook
- [x] Document Route A live test results

### OpenAI Secure MCP Tunnel Mode

- [x] Connect ChatGPT Custom App through OpenAI Secure MCP Tunnel
- [x] Run `tunnel-client` inside Debian proot
- [x] Keep Termux MCP HTTP on `127.0.0.1:3003/mcp`
- [x] Keep Termux API on `127.0.0.1:3001`
- [x] Keep Cloudflare Route A off in this mode
- [x] Prompt for OpenAI runtime API key instead of storing it in the repo
- [x] Add OpenAI tunnel start/status/stop helpers
- [x] Add Debian tunnel-client helper
- [x] Document OpenAI tunnel operator runbook
- [x] Document OpenAI tunnel helper test results

### Debian Proot Playwright Worker

- [x] Run Chromium/Playwright inside Debian proot
- [x] Expose worker locally on port `3002`
- [x] Add browser inspection MCP tools
- [x] Add worker status and notes helpers
- [x] Document Debian proot Playwright setup

## Security Rules

- [x] Do not expose API port `3001` publicly
- [x] Do not expose Playwright worker port `3002` publicly
- [x] Expose only MCP HTTP port `3003` for Route A public mode
- [x] Keep OpenAI runtime API key out of git
- [x] Keep Cloudflare tunnel token out of git
- [x] Keep MCP HTTP token out of git
- [x] Keep runtime files such as logs, reports, database, and `.runtime/` out of git

## Recently Completed Milestones

- [x] Phase 5 OpenAI Secure MCP Tunnel proof
- [x] Phase 6 OpenAI Secure MCP Tunnel operator helpers
- [x] Phase 6.5 OpenAI tunnel helper test documentation
- [x] README updated with OpenAI Secure MCP Tunnel mode
- [x] Repo audit after Phase 6.5
- [x] Confirmed `server.log` is ignored and not tracked
- [x] Removed temporary repo review artifact

## Next Recommended Phase

## Phase 7 - Cookie/Session Login Workflow

Goal: allow user-controlled login/session handling for websites that require authentication, without giving credentials to ChatGPT and without committing secrets to the repo.

Planned work:

- [ ] Write design doc for cookie/session login workflow
- [ ] Define security rules for browser cookies and session files
- [ ] Decide storage location for local-only session files
- [ ] Add `.gitignore` rules for cookie/session artifacts if needed
- [ ] Define manual login flow using a user-controlled browser
- [ ] Define import/export flow for Playwright context or cookie JSON
- [ ] Test with a safe non-sensitive website first
- [ ] Document what should never be pasted into ChatGPT
- [ ] Keep implementation lightweight to avoid overloading Samsung S22

Out of scope for first Phase 7 pass:

- [ ] Full password manager integration
- [ ] Automatic credential entry
- [ ] Storing usernames/passwords in repo or scripts
- [ ] Heavy background browser automation

## Later Phase - Optional OAuth

OAuth is not required for the current working OpenAI Secure MCP Tunnel mode.

Consider OAuth later only if a production-style ChatGPT App authentication layer is needed.

Possible future work:

- [ ] Add OAuth protected-resource metadata endpoint
- [ ] Add OAuth authorization-server metadata endpoint
- [ ] Decide token validation model
- [ ] Decide scopes and access policy
- [ ] Document difference between local no-auth tunnel mode and production OAuth mode

## Later Phase - Portfolio Polish

- [ ] Add screenshots of Termux runtime
- [ ] Add screenshots of ChatGPT Custom App tool calls
- [ ] Add architecture diagram image
- [ ] Add short demo script for recruiter walkthrough
- [ ] Add resume bullet points
- [ ] Add LinkedIn project summary
- [ ] Add concise "What this demonstrates" section
- [ ] Add limitations and security tradeoffs in simple language

## Later Phase - Automated Smoke Tests

- [ ] Add smoke test for API health
- [ ] Add smoke test for MCP HTTP health
- [ ] Add smoke test for scan `example.com`
- [ ] Add smoke test for Route A when tunnel is running
- [ ] Add smoke test notes for OpenAI Secure MCP Tunnel mode

## Parking Lot

These items are intentionally not prioritized now:

- [ ] Improve scanner scoring rules
- [ ] Add advanced domain typo correction
- [ ] Add heavier browser fallback logic
- [ ] Add background scheduling
- [ ] Add mobile app packaging
- [ ] Add multi-user auth
