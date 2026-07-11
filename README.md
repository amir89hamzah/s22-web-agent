# S22 Web Agent

S22 Web Agent repurposes a Samsung Galaxy S22 into a controlled, self-hosted MCP and browser-automation execution node.

It runs across:

```text
Samsung S22
  -> Termux
  -> Node.js API and MCP servers
  -> SQLite local persistence
  -> Debian proot
  -> Playwright + Chromium
  -> VNC/noVNC for human-controlled login
  -> controlled tunnel access when intentionally enabled
```

The project is a learning and portfolio proof for applied AI automation, MCP tool development, secure browser workflows, and constrained-device engineering.

## Current status

Core scanner, MCP, browser worker, manual-login, and authenticated-session continuity proofs are complete.

Latest completed proof:

```text
Phase 7O-E — long-gap session continuity: PASS
```

A real GitHub dummy-account profile named `github-manual-local` remained authenticated after:

- full S22 power-off and restart
- approximately one week offline
- runtime shutdown
- SSH reconnect
- repeated headless reuse

The authenticated scan passed without starting VNC/noVNC and without logging in again.

Current next phase:

```text
Phase 7P — operator-quality profile lifecycle helpers
```

Planned commands:

```text
session:profile:status
session:profile:probe
session:profile:ensure
```

Planned safe states:

```text
missing
present_unverified
valid
expired_or_logged_out
domain_mismatch
runtime_error
```

`session:profile:ensure` must never auto-start public noVNC. Any refresh remains a human-controlled manual-login action.

## What the project currently demonstrates

- CLI webpage scanning
- local HTTP API scanning
- SQLite-backed scan history
- Markdown report generation
- MCP stdio server
- MCP Streamable HTTP server
- stateful MCP HTTP sessions
- optional bearer-token protection
- Cloudflare Route A public MCP proof
- OpenAI Secure MCP Tunnel proof
- Debian proot Playwright/Chromium worker
- browser-rendered inspection through MCP
- manual login through VNC
- stable tmux-held VNC
- local noVNC gateway
- temporary public noVNC proof protected by Cloudflare Access
- Playwright `storageState` capture
- named local session profiles
- domain-allowlisted authenticated scans
- MCP `browser_scan_with_profile`
- real GitHub dummy-account login and reuse
- session reuse without reopening noVNC
- session continuity after device restart and a long offline gap

## Project positioning

S22 Web Agent is intentionally not a general-purpose personal-agent framework.

It is a controlled execution node that exposes approved MCP tools while keeping sensitive local services and browser session artifacts private.

The preferred relationship is:

```text
ChatGPT / Codex / another MCP client
  -> approved MCP tools
  -> S22 Web Agent
  -> local scanner or browser workflow
```

See `docs/why-custom-s22-web-agent.md` for the detailed design rationale.

## Architecture

### Local scanner path

```text
CLI or local HTTP request
  -> scanner module
  -> SQLite
  -> Markdown report
```

### Browser path

```text
MCP browser tool or local helper
  -> Termux wrapper
  -> Debian proot Playwright worker
  -> Chromium
```

### Authenticated session path

```text
Human-controlled login through VNC/noVNC
  -> Playwright storageState saved under .runtime/
  -> named profile with domain allowlist
  -> future headless authenticated scans
```

The user performs login manually. Passwords, cookies, MFA codes, tokens, and `storageState` contents are not passed to the AI assistant.

### Route A public MCP path

```text
Remote MCP client
  -> https://s22agent.aidesk.rest/mcp
  -> Cloudflare Named Tunnel
  -> 127.0.0.1:3003/mcp
```

Only the MCP HTTP server is exposed in Route A.

### Temporary public noVNC path

```text
Remote browser
  -> Cloudflare Access protected temporary hostname
  -> cloudflared connector on S22
  -> 127.0.0.1:6080 noVNC
  -> 127.0.0.1:5901 VNC
  -> Debian Chromium
```

This route is separate from the MCP hostname. It is temporary, operator-controlled, and must be stopped after use.

## Ports and exposure policy

| Port | Service | Exposure rule |
|---:|---|---|
| `3001` | Local HTTP API | Never public |
| `3002` | Debian Playwright worker | Never public |
| `3003` | MCP Streamable HTTP | May be exposed only through an intentional protected MCP route |
| `5901` | Raw VNC | Local-only; never public |
| `6080` | noVNC/websockify | Local-only by default; temporary protected public route only when intentionally started |
| `3107` | Local demo login server | Local-only |

## Security boundary

The following rules are mandatory:

- Never request or print passwords.
- Never request or print cookies.
- Never request or print session tokens.
- Never request or print MFA codes.
- Never print or paste `storageState.json` contents.
- Keep `.runtime/sessions/` out of Git.
- Keep API port `3001` local-only.
- Keep Playwright worker port `3002` local-only.
- Keep raw VNC port `5901` local-only.
- Expose MCP port `3003` only through an intentional controlled route.
- Keep public noVNC temporary and intentionally started.
- Never auto-start public noVNC as a fallback.
- Keep tunnel tokens and MCP tokens out of the repository.
- Rotate the Cloudflare tunnel token before future public testing because it appeared in early raw logs before helper hardening.

Generated runtime data is ignored by Git:

```text
.runtime/
data/
reports/
*.log
.env
```

## Main operating modes

### Local CLI/API

Use for ordinary local scanning and development.

```bash
node src/index.js scan example.com
npm run api:start
npm run api:status
npm run api:stop
```

Default API endpoint:

```text
http://127.0.0.1:3001
```

### MCP stdio

```bash
npm run mcp
```

### MCP Streamable HTTP

```bash
npm run mcp:http:start
npm run mcp:http:status
npm run mcp:http:stop
```

Default endpoint:

```text
http://127.0.0.1:3003/mcp
```

### Route A Cloudflare MCP

```bash
npm run route:a:start
npm run route:a:status
npm run route:a:stop
```

Public endpoint:

```text
https://s22agent.aidesk.rest/mcp
```

Do not expose ports `3001` or `3002` through this route.

### OpenAI Secure MCP Tunnel

Start Termux services:

```bash
npm run openai:tunnel:start
```

Run the tunnel client inside Debian proot:

```bash
proot-distro login debian
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
npm run openai:tunnel:client:debian
```

Status and stop:

```bash
npm run openai:tunnel:status
npm run openai:tunnel:stop
```

The runtime key is prompted locally and is not stored in the repository.

## Session and login helpers

### VNC

```bash
npm run session:vnc:start
npm run session:vnc:status
npm run session:vnc:stop
```

Stable tmux-held VNC:

```bash
npm run session:vnc:start:stable
npm run session:vnc:stop:stable
```

### Local noVNC

```bash
npm run session:novnc:start:local
npm run session:novnc:status:local
npm run session:novnc:stop:local
```

### Manual login through local noVNC

```bash
SESSION_LOGIN_TIMEOUT_MS=1200000 npm run session:manual-login:novnc:start -- <profile> <login-url>
npm run session:manual-login:novnc:status -- <profile>
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:manual-login:novnc:complete -- <profile> <authenticated-url> "<expected-text>"
npm run session:manual-login:novnc:cancel -- <profile>
```

### Reuse a saved profile

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:profile:scan -- <profile> <url> "<expected-text>"
```

A saved file is not proof that the website session is still valid. The target website may expire, revoke, or challenge the session. Phase 7P will add explicit status and probe classification.

### Temporary public noVNC helpers

```bash
npm run session:novnc:public-temp:start-guide -- <public-host>
npm run session:novnc:public-temp:status -- <public-host>
npm run session:novnc:public-temp:stop-guide -- <public-host>

npm run session:novnc:public-temp:tunnel:start
npm run session:novnc:public-temp:tunnel:status
npm run session:novnc:public-temp:tunnel:stop
```

These commands do not change the rule that public noVNC must be temporary, protected, and human-controlled.

## MCP tools

Main tools include:

```text
job_radar_health
job_radar_scan
job_radar_list_pages
job_radar_get_page
job_radar_get_report
browser_inspect_url
browser_scan_url
browser_scan_with_profile
browser_start_manual_login
browser_manual_login_status
browser_complete_manual_login
browser_cancel_manual_login
```

The authenticated profile tool accepts only a named profile, target URL, and optional expected text. It does not accept passwords, cookies, tokens, or an arbitrary `storageState` path.

## Completed session-gateway milestones

| Phase | Result |
|---|---|
| 7A | Session gateway design documented |
| 7B | Cookie JSON path deferred |
| 7C | VNC baseline, session capture, and local reuse proof passed |
| 7D | Profile-aware headless scan passed |
| 7E | Proof guard hardening passed |
| 7F | MCP profile scan integration passed |
| 7G | Pre-login security cleanup completed |
| 7H | Real GitHub dummy login and authenticated scan passed |
| 7I | Stable tmux VNC and repeated authenticated verification passed |
| 7J | Remote manual-login gateway design documented |
| 7K | Local noVNC gateway proof passed |
| 7L | Public HTTPS noVNC safety design documented |
| 7M | Local noVNC-assisted manual-login integration passed |
| 7N | Cloudflare Access protected temporary public noVNC proof passed |
| 7O | Saved-profile agent continuity passed |
| 7O-E | GitHub dummy session survived full restart and approximately one week offline |

## Important documentation

```text
docs/session-gateway-design.md
docs/session-gateway-vnc-smoke-test-results.md
docs/session-gateway-capture-proof.md
docs/session-gateway-login-reuse-proof.md
docs/session-gateway-profile-scan.md
docs/phase-7g-pre-login-cleanup.md
docs/phase-7h-real-login-trial-result.md
docs/phase-7i-repeat-auth-profile-verification.md
docs/phase-7j-remote-manual-login-gateway-design.md
docs/phase-7l-public-https-novnc-gateway-design.md
docs/phase-7m-local-novnc-assisted-manual-login.md
docs/phase-7n-temporary-cloudflare-access-novnc-proof.md
docs/phase-7o-agent-continuity-proof.md
docs/phase-7o-e-long-gap-session-continuity.md
docs/why-custom-s22-web-agent.md
```

For AI-assisted repository navigation, see `llm-index.yaml`.

## Known limitations

- Android may kill Termux under heavy runtime load.
- tmux protects against SSH disconnect but not Android terminating the Termux app.
- AnyDesk, SSH, VNC, noVNC, and Chromium together can make the S22 unstable.
- A saved profile may exist while the remote website session is expired.
- Remote websites can revoke sessions independently.
- Browser automation performance is limited by phone hardware, thermal behavior, and proot overhead.
- The project is a controlled engineering proof, not a production-grade managed server.

## Next recommended work

Phase 7P will add operator-quality profile lifecycle helpers:

1. `session:profile:status`
2. `session:profile:probe`
3. `session:profile:ensure`
4. explicit safe states
5. safe local manual-login refresh instructions
6. no automatic public noVNC start

Do not upgrade npm to a new major version during this phase merely because an update notice appears.
