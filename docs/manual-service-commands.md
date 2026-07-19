# S22 Web Agent — Manual Service Commands

## Purpose

This document records the manual start, status, and stop commands for the main
S22 Web Agent services.

For normal day-to-day operation, use the unified operator lifecycle instead:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:start
npm run s22:status
npm run s22:stop
```

The individual service commands in this document are primarily for
troubleshooting, diagnostics, controlled testing, or recovery.

Do not manually start multiple copies of the same service.

## Normal operator commands

### One-time secret setup

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:secrets:setup
```

This stores required runtime secrets outside the Git repository under:

```text
~/.config/s22-web-agent/
```

The current secret files are:

```text
control-plane-api-key
cloudflare-tunnel-token
```

Never paste secret values into documentation, chat, screenshots, logs, or Git.

### Start the normal S22 stack

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:start
```

Expected healthy result:

```text
PASS: S22 Web Agent READY
```

The normal startup brings up:

- local API on `127.0.0.1:3001`
- local MCP HTTP on `127.0.0.1:3003`
- stable OpenAI tunnel-client in tmux

The browser worker, VNC, Chromium, local noVNC, and public noVNC tunnel remain
lazy and start only when required.

### Check the complete S22 status

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:status
```

A healthy core runtime normally reports:

```text
Overall: READY
API 3001: ready
MCP 3003: ready
OpenAI tmux: running
Tunnel process: running
```

The following may correctly report `off` while no browser task or human handoff
is active:

```text
Browser worker
VNC 5901
noVNC 6080
Public tunnel
```

### Stop the complete S22 stack

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:stop
```

Expected final result:

```text
Overall: STOPPED
PASS: S22 Web Agent fully stopped.
```

The unified stop command attempts to clean up:

- temporary public noVNC Cloudflare tunnel
- local noVNC
- Playwright worker and active browser task
- VNC and Chromium display runtime
- runtime watcher
- OpenAI tunnel-client
- local MCP HTTP
- local API

Use this unified stop command for normal shutdown instead of manually stopping
each component.

---

# Manual and troubleshooting commands

## Local HTTP API — port 3001

Purpose:

The local HTTP API provides the S22 Web Agent scanner and local application
service.

Start:

```bash
npm run api:start
```

Status:

```bash
npm run api:status
```

Stop:

```bash
npm run api:stop
```

Default health endpoint:

```text
http://127.0.0.1:3001/health
```

The API must remain local-only.

Use these commands when troubleshooting the API independently from the MCP or
tunnel layers.

---

## MCP Streamable HTTP — port 3003

Purpose:

The MCP HTTP server exposes the intended MCP tool surface used by the current
S22 integration.

For the normal OpenAI tunnel mode, the MCP server is bound locally.

Start:

```bash
MCP_HTTP_HOST=127.0.0.1 npm run mcp:http:start
```

Status:

```bash
npm run mcp:http:status
```

Stop:

```bash
npm run mcp:http:stop
```

Default local endpoint:

```text
http://127.0.0.1:3003/mcp
```

Default health endpoint:

```text
http://127.0.0.1:3003/health
```

Security warning:

If MCP HTTP is intentionally bound to a non-loopback address, the current
launcher requires `MCP_HTTP_TOKEN`.

Do not expose unauthenticated MCP HTTP on a public or untrusted network.

---

## OpenAI local MCP/API runtime

Purpose:

This helper starts the local API and MCP HTTP services in the configuration used
by the OpenAI Secure MCP Tunnel path.

Start:

```bash
npm run openai:tunnel:start
```

Status:

```bash
npm run openai:tunnel:status
```

Stop:

```bash
npm run openai:tunnel:stop
```

This helper does not itself start the stable Debian tunnel-client tmux session.

For normal operation, prefer:

```bash
npm run s22:start
```

because the unified lifecycle starts both the local runtime and the stable
OpenAI tunnel-client.

---

## OpenAI tunnel-client — stable tmux service

Purpose:

The OpenAI tunnel-client runs inside Debian proot and connects the local MCP
HTTP server to the approved OpenAI control path.

The stable runtime uses tmux session:

```text
s22openai
```

Normal non-interactive start used by the unified S22 lifecycle:

```bash
OPENAI_TUNNEL_ATTACH=0 npm run openai:tunnel:client:start:stable
```

Interactive/manual stable start:

```bash
npm run openai:tunnel:client:start:stable
```

Status:

```bash
npm run openai:tunnel:client:status:stable
```

Stop:

```bash
npm run openai:tunnel:client:stop:stable
```

Manual Debian foreground runner:

```bash
proot-distro login debian
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
npm run openai:tunnel:client:debian
```

The foreground runner is mainly for troubleshooting.

The current default tunnel-client path is:

```text
/data/data/com.termux/files/home/tools/openai-tunnel/tunnel-client
```

Do not place the OpenAI runtime API key in command history or Git.

---

## Playwright browser worker — port 3002

Purpose:

The Debian Playwright worker owns the persistent browser task runtime.

The normal S22 architecture starts this worker automatically when browser work
requires it.

Manual stable start:

```bash
npm run worker:start:stable
```

Stable status:

```bash
npm run worker:status:stable
```

Stop:

```bash
npm run worker:stop:stable
```

Additional diagnostic status:

```bash
npm run worker:status
```

Default health endpoint:

```text
http://127.0.0.1:3002/health
```

The worker must remain local-only.

The stable worker normally runs under tmux session:

```text
s22worker
```

Do not manually start a second worker when port `3002` or tmux session
`s22worker` is already active.

---

## VNC display runtime — local port 5901

Purpose:

VNC provides the visible Debian display used by Chromium when human-visible
browser interaction is required.

The normal browser workflow can start VNC automatically.

Manual stable start:

```bash
npm run session:vnc:start:stable
```

Status:

```bash
npm run session:vnc:status
```

Stable stop:

```bash
npm run session:vnc:stop:stable
```

The stable VNC runtime normally uses:

```text
Display: :1
Port: 5901
tmux session: s22vnc
```

The VNC server is configured for local-only access.

Raw VNC port `5901` must never be exposed publicly.

The older non-stable helpers also remain available:

```bash
npm run session:vnc:start
npm run session:vnc:status
npm run session:vnc:stop
```

Prefer the stable helpers for manual troubleshooting unless an older proof
procedure specifically requires the legacy path.

---

## Local noVNC / websockify — port 6080

Purpose:

Local noVNC converts the local VNC service into a browser-accessible local web
interface.

The Phase 7V browser-control handoff starts and stops local noVNC automatically.

Manual start:

```bash
npm run session:novnc:start:local
```

Status:

```bash
npm run session:novnc:status:local
```

Stop:

```bash
npm run session:novnc:stop:local
```

Default local URL:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

The local noVNC tmux session normally uses:

```text
s22-novnc-local
```

Port `6080` must remain local-only by default.

A stopped noVNC listener is more important than old process-count output when
investigating the known stale/orphan-looking proot or websockify observation.

---

## Temporary protected public noVNC Cloudflare tunnel

Purpose:

This temporary connector exposes the local noVNC service through the configured
protected Cloudflare path during an intentional human browser-control handoff.

In normal Phase 7V operation, this lifecycle is automatic through
`browser_task_handoff`.

Manual start:

```bash
npm run session:novnc:public-temp:tunnel:start
```

Status:

```bash
npm run session:novnc:public-temp:tunnel:status
```

Stop:

```bash
npm run session:novnc:public-temp:tunnel:stop
```

The expected tmux session is:

```text
s22-cloudflared-public-temp
```

The Cloudflare tunnel token is normally read from:

```text
~/.config/s22-web-agent/cloudflare-tunnel-token
```

Do not paste the token directly into chat, documentation, screenshots, or shell
history.

This public connector must remain:

- temporary
- protected
- intentionally used
- separate from raw VNC
- separate from the normal OpenAI MCP tunnel path

Do not expose port `5901` directly.

---

## Runtime diagnostics

### One-time runtime snapshot

```bash
npm run runtime:doctor
```

Despite the name, `runtime:doctor` is a runtime diagnostic snapshot.

It currently reports information such as:

- memory and swap
- selected memory pressure information
- project-related process counts
- known PID file state
- tmux sessions
- visible high-memory processes
- repository filesystem usage

It is not the future proposed `s22:doctor` installation and environment validator.

It does not currently provide a complete fresh-install dependency and
environment validation.

### Runtime diagnostic watcher

Start:

```bash
npm run runtime:watch:start
```

Status:

```bash
npm run runtime:watch:status
```

Stop:

```bash
npm run runtime:watch:stop
```

Use the watcher only when historical runtime evidence is required.

---

# Special, legacy, and proof paths

## Route A Cloudflare MCP path

Commands:

```bash
npm run route:a:start
npm run route:a:status
npm run route:a:stop
```

Route A was used as an earlier protected public MCP proof.

It is not the normal current operator path.

The current normal architecture uses:

```text
local MCP HTTP
→ OpenAI Secure MCP Tunnel
→ intended OpenAI client path
```

Do not start Route A as an alternative to the current OpenAI MCP path during
normal operation.

---

## MCP stdio

Manual foreground MCP stdio server:

```bash
npm run mcp
```

This is not the normal current OpenAI HTTP/tunnel operator path.

Use it only when a local stdio MCP workflow or diagnostic specifically requires
it.

---

## Historical login, session, and proof helpers

The repository contains additional helpers for:

- session capture
- manual login
- local noVNC-assisted login
- saved profile status and probing
- authenticated task lifecycle
- older Cloudflare gateway proofs
- MCP proof scripts
- demo login flows

These commands remain useful for targeted regression or historical proof
reproduction, but they are not part of the normal S22 operator lifecycle.

Refer to the relevant phase documentation before using them.

---

# tmux sessions used by the current runtime

Common tmux session names:

```text
s22openai                  OpenAI tunnel-client
s22worker                  Playwright worker
s22vnc                     VNC display runtime
s22-novnc-local            local noVNC/websockify
s22-cloudflared-public-temp temporary public Cloudflare connector
```

List active tmux sessions:

```bash
tmux ls
```

Attach to a specific session for troubleshooting:

```bash
tmux attach -t <session-name>
```

Detach without stopping the process:

```text
Ctrl+b
then d
```

Do not kill tmux sessions blindly when the unified S22 runtime is active.

---

# Ports and exposure rules

| Port | Service | Rule |
|---:|---|---|
| `3001` | Local HTTP API | Local-only; never public |
| `3002` | Debian Playwright worker | Local-only; never public |
| `3003` | MCP Streamable HTTP | Intentional protected MCP route only |
| `5901` | Raw VNC | Local-only; never public |
| `6080` | noVNC/websockify | Local-only by default; temporary protected public route only |

---

# Recommended troubleshooting order

When S22 does not behave as expected, start with:

```bash
npm run s22:status
```

If the core runtime is degraded, inspect only the relevant component using the
manual status commands in this document.

For broader runtime evidence:

```bash
npm run runtime:doctor
```

When a component needs to be restarted, prefer stopping that component through
its documented helper rather than killing processes manually.

For a complete reset of the project-owned runtime:

```bash
npm run s22:stop
npm run s22:start
```

This is especially important after code changes because already-running Node.js
processes may still contain older code in memory.

---

# Security reminders

Never print, paste, commit, or expose:

- passwords
- cookies
- session tokens
- MFA codes
- OpenAI runtime API keys
- Cloudflare tunnel tokens
- saved `storageState` contents

Keep these runtime paths outside Git:

```text
.runtime/
data/
reports/
.env
```

Keep the normal operator boundary simple:

```text
npm run s22:start
ChatGPT performs work
npm run s22:status
npm run s22:stop
```

Use the individual service commands only when there is a specific operational
or troubleshooting reason.
