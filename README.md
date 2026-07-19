# S22 Web Agent

S22 Web Agent repurposes a Samsung Galaxy S22 into a controlled, self-hosted MCP and browser-automation execution node.

```text
Samsung S22
  -> Termux
  -> Node.js API and MCP servers
  -> SQLite local persistence
  -> Debian proot
  -> Playwright + Chromium
  -> VNC/noVNC for human-controlled login
  -> controlled tunnels when intentionally enabled
```

The project is a learning and portfolio proof for applied AI automation, MCP tool development, secure browser workflows, and constrained-device engineering.

## Current status

Latest completed runtime proof:

```text
Phase 7V — Automatic Protected On-Demand noVNC Handoff: PASS
```

Phase 7V confirmed automatic local noVNC and protected Cloudflare startup during
a browser-control handoff, automatic return of the full public noVNC control
URL, cleanup of the temporary public gateway after handoff, and preservation of
the same persistent Chromium session.

The normal MCP HTTP surface remains the intended eight tools: five Job Radar
tools plus `browser_task_run`, `browser_task_handoff`, and
`browser_task_status`.

Current engineering checkpoint:

```text
Documentation Closure — Operator & Reproducibility
```

Current operator and reproducibility documentation:

```text
docs/operator-quickstart.md
docs/manual-service-commands.md
docs/installation-and-setup.md
```

Future browser capability, reliability, installation automation, and
`s22:doctor` work remain tracked in `TODO.md` and are not part of this
documentation closure.

## Android runtime note

The first heavy public-login trials repeatedly ended with Android signal 9 around approximately 35 to 36 visible monitored processes even though `MemAvailable` was still about 3 GiB. This did not resemble straightforward Linux RAM exhaustion.

For the demonstrated successful full-stack proof, the Android phantom-process limit was raised to `256` through ADB. The operator also used one primary SSH session, tmux, Termux wake lock, and RAM Plus set to 8 GB. With that controlled configuration, Cloudflare, MCP, Debian proot, Chromium, VNC, noVNC, and the manual-login workflow ran together without the previous signal-9 failure.

This is strong operational evidence, not a perfectly isolated laboratory proof, because the SSH/tmux operating procedure also changed. The Android setting is outside this repository and cannot be enforced by the Node.js code.

Detailed result:

```text
docs/android-phantom-process-runtime-result.md
docs/phase-7q-c2r-runtime-diagnostics.md
```

## Current capabilities

- CLI and HTTP webpage scanning
- SQLite-backed scan history
- Markdown report generation
- MCP stdio and Streamable HTTP
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
- session continuity after S22 restart and a long offline gap
- explicit saved-profile lifecycle states
- secret-safe runtime doctor and diagnostic watcher
- full-stack runtime proof with Android phantom-process limit set to 256

## Project positioning

S22 Web Agent is not intended to become a broad personal-agent framework. It is a controlled execution node that exposes approved MCP tools while keeping local services and browser session artifacts private.

```text
ChatGPT / Codex / another MCP client
  -> approved MCP tools
  -> S22 Web Agent
  -> local scanner or browser workflow
```

See `docs/why-custom-s22-web-agent.md` for the detailed rationale.

## Architecture

### Scanner path

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

Passwords, cookies, tokens, MFA codes, and `storageState` contents are not passed to the AI assistant.

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

This route is separate from the MCP hostname. It must remain temporary, protected, human-controlled, and intentionally started.

## Ports and exposure policy

| Port | Service | Exposure rule |
|---:|---|---|
| `3001` | Local HTTP API | Never public |
| `3002` | Debian Playwright worker | Never public |
| `3003` | MCP Streamable HTTP | Intentional protected MCP route only |
| `5901` | Raw VNC | Local-only; never public |
| `6080` | noVNC/websockify | Local-only by default; temporary protected route only |
| `3107` | Demo login server | Local-only |

## Security boundary

- Never request or print passwords.
- Never request or print cookies.
- Never request or print session tokens.
- Never request or print MFA codes.
- Never print or paste `storageState.json` contents.
- Keep `.runtime/sessions/` out of Git.
- Keep ports `3001`, `3002`, and `5901` local-only.
- Expose port `3003` only through an intentional controlled MCP route.
- Keep public noVNC temporary and intentionally started.
- Never auto-start public noVNC as a fallback.
- Keep tunnel tokens and MCP tokens out of the repository.
- Rotate the Cloudflare tunnel token before future public tests because it appeared in early raw logs before helper hardening.
- Do not upgrade npm to a new major version during this phase merely because an update notice appears.
- The current Termux installation is from Google Play; do not propose F-Droid migration by default.
- Treat the phantom-process setting as an explicit Android operator configuration, not an application default.

Runtime artifacts ignored by Git:

```text
.runtime/
data/
reports/
*.log
.env
```

## Main operating modes

### Local CLI/API

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

### OpenAI Secure MCP Tunnel

```bash
npm run openai:tunnel:start
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

## Session helpers

### VNC and noVNC

```bash
npm run session:vnc:start
npm run session:vnc:status
npm run session:vnc:stop

npm run session:vnc:start:stable
npm run session:vnc:stop:stable

npm run session:novnc:start:local
npm run session:novnc:status:local
npm run session:novnc:stop:local
```

### Human-controlled local login

```bash
SESSION_LOGIN_TIMEOUT_MS=1200000 npm run session:manual-login:novnc:start -- <profile> <login-url>
npm run session:manual-login:novnc:status -- <profile>
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:manual-login:novnc:complete -- <profile> <authenticated-url> "<expected-text>"
npm run session:manual-login:novnc:cancel -- <profile>
```

### Existing profile scan

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:profile:scan -- <profile> <url> "<expected-text>"
```

## Phase 7P profile lifecycle

A profile file existing locally does not prove that the remote website session is still authenticated.

### States

```text
missing
present_unverified
valid
expired_or_logged_out
domain_mismatch
runtime_error
```

Exit codes:

| State | Code |
|---|---:|
| `present_unverified` | `0` |
| `valid` | `0` |
| `missing` | `20` |
| `expired_or_logged_out` | `21` |
| `domain_mismatch` | `22` |
| `runtime_error` | `23` |

### Lightweight status

Does not launch Chromium:

```bash
npm run session:profile:status -- <profile> [target-url]
```

An existing readable profile normally returns:

```text
present_unverified
```

### Live authenticated probe

Launches headless Chromium inside Debian proot and requires an authenticated marker:

```bash
npm run session:profile:probe -- <profile> <authenticated-url> "<expected-text>"
```

```text
marker found     -> valid
marker not found -> expired_or_logged_out
```

Page text excerpts are suppressed by design.

### Reuse-first ensure

```bash
npm run session:profile:ensure -- <profile> <authenticated-url> "<expected-text>" [login-url]
```

`ensure` checks local status first and then performs a live probe. When refresh is required, it prints safe local manual-login guidance with URL placeholders. It does not echo supplied URLs and does not start VNC, noVNC, Cloudflare, or any public route.

### Local self-test

```bash
npm run session:profile:self-test
```

The disposable test covers:

```text
missing
present_unverified
domain_mismatch
runtime_error
```

It does not touch a real profile.

Detailed implementation and test instructions:

```text
docs/phase-7p-profile-lifecycle-helpers.md
```

## Required S22 verification

After pulling the latest `main` branch:

```bash
cd ~/projects/mobile-job-radar-agent
git pull --ff-only
npm run session:profile:self-test
npm run session:profile:status -- github-manual-local https://github.com/settings/profile
npm run session:profile:probe -- github-manual-local https://github.com/settings/profile "Public profile"
npm run session:profile:ensure -- github-manual-local https://github.com/settings/profile "Public profile" https://github.com/login
git status --short
```

Expected while the GitHub dummy session remains authenticated:

```text
self-test -> PASS
status    -> present_unverified
probe     -> valid
ensure    -> valid
git status --short -> no output
```

These checks do not require VNC, noVNC, or a public tunnel.

## MCP tools

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

The authenticated profile MCP tool accepts only a named profile, target URL, and optional expected text. It does not accept passwords, cookies, tokens, or an arbitrary `storageState` path.

## Session-gateway milestones

| Phase | Result |
|---|---|
| 7A | Session gateway design documented |
| 7B | Cookie JSON path deferred |
| 7C | VNC baseline, capture, and local reuse passed |
| 7D | Profile-aware headless scan passed |
| 7E | Proof guard hardening passed |
| 7F | MCP profile scan integration passed |
| 7G | Pre-login security cleanup completed |
| 7H | Real GitHub dummy login and scan passed |
| 7I | Stable tmux VNC and repeated verification passed |
| 7J | Remote login gateway design documented |
| 7K | Local noVNC proof passed |
| 7L | Public HTTPS noVNC design documented |
| 7M | Local noVNC-assisted manual login passed |
| 7N | Cloudflare Access public noVNC demo proof passed |
| 7O | Saved-profile continuity passed |
| 7O-E | Full restart plus approximately one week offline passed |
| 7P | Implemented; live S22 verification pending |
| 7Q-C2R | Runtime diagnostics validated; full-stack signal-9 recovery proof passed with phantom-process limit 256 |

## Important documentation

```text
docs/android-phantom-process-runtime-result.md
docs/phase-7q-c2r-runtime-diagnostics.md
docs/phase-7o-e-long-gap-session-continuity.md
docs/phase-7p-profile-lifecycle-helpers.md
docs/phase-7o-agent-continuity-proof.md
docs/phase-7n-temporary-cloudflare-access-novnc-proof.md
docs/phase-7m-local-novnc-assisted-manual-login.md
docs/session-gateway-design.md
docs/why-custom-s22-web-agent.md
```

For AI-assisted repository navigation, see `llm-index.yaml`.

## Known limitations

- Android may still kill Termux under heavy runtime load; the demonstrated configuration raised the phantom-process limit to 256, but this is not an application-level guarantee.
- tmux protects against SSH disconnect but not Android terminating Termux.
- AnyDesk, multiple SSH sessions, VNC, noVNC, and Chromium together can make the S22 unstable.
- The phantom-process setting is device and firmware dependent and may need operator verification after Android updates.
- A small orphan `websockify`/proot pair may remain after some noVNC shutdown paths.
- A saved profile may exist while the remote session is expired.
- Websites can revoke or challenge sessions independently.
- An absent expected marker can also mean the target page content changed; `expired_or_logged_out` is deliberately a fail-safe classification.
- Browser performance is limited by phone hardware, thermal behavior, and proot overhead.
- The project is a controlled engineering proof, not a production-grade managed server.
