# OpenAI Secure MCP Tunnel Helper Test Results

This document records the Phase 6 helper-script test for running S22 Web Agent through OpenAI Secure MCP Tunnel.

## Scope

This test validates the operator helper workflow added after the Phase 5 OpenAI Secure MCP Tunnel spike.

The tested helper scripts are:

```bash
npm run openai:tunnel:start
npm run openai:tunnel:client:debian
npm run openai:tunnel:status
npm run openai:tunnel:stop
```

## Tested Commit

```text
284bedc Add OpenAI tunnel operator helpers
```

## Runtime Mode

This test used OpenAI Secure MCP Tunnel mode, not Route A Cloudflare mode.

```text
ChatGPT Custom App
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client inside Debian proot
  -> Termux MCP HTTP on 127.0.0.1:3003/mcp
  -> Termux API on 127.0.0.1:3001
  -> SQLite database and report output
```

## Security Boundary

The following rules were followed:

- Cloudflare Route A was not started.
- API port `3001` remained local-only.
- Playwright worker port `3002` remained local-only.
- MCP HTTP port `3003` was used locally by `tunnel-client`.
- MCP HTTP auth was disabled only for the local OpenAI tunnel path.
- The OpenAI runtime API key was entered interactively.
- The OpenAI runtime API key was not committed to the repository.

## Helper Startup

### Terminal 1 — Termux

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:start
```

Expected local state:

```text
API 3001 running
MCP HTTP 3003 running
MCP HTTP auth: disabled
cloudflared: not running
```

### Terminal 2 — Debian proot

```bash
proot-distro login debian
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
npm run openai:tunnel:client:debian
```

The Debian helper prompted for the OpenAI runtime API key when `CONTROL_PLANE_API_KEY` was not already set.

This is intentional because the key should not be stored in the repository or bundled into project exports.

## Known Non-Blocking Warning

The OAuth metadata check can fail in this phase:

```text
oauth_metadata FAIL HTTP 404
```

This was expected because OAuth is intentionally out of scope for Phase 6.

The helper may continue when only OAuth metadata fails and the local MCP target is reachable.

## ChatGPT Custom App Test Results

### 1. Health check

Prompt:

```text
Check the health of my S22 Web Agent.
```

Result:

```json
{
  "ok": true,
  "service": "s22-web-agent",
  "runtime": "s22-termux",
  "dbPath": "/data/data/com.termux/files/home/projects/mobile-job-radar-agent/data/radar.db"
}
```

Status:

```text
PASS
```

### 2. List saved pages

Prompt:

```text
List saved pages in my S22 Web Agent.
```

Result:

```text
Saved pages were listed successfully.
```

Status:

```text
PASS
```

### 3. Scan example.com

Prompt:

```text
Scan example.com with my S22 Web Agent.
```

Result:

```json
{
  "ok": true,
  "url": "https://example.com/",
  "title": "Example Domain",
  "category": "unknown",
  "relevance_score": 15
}
```

Status:

```text
PASS
```

### 4. Scan Exact Automation domain

Prompt:

```text
Scan www.exactautomation.com.y with my S22 Web Agent.
```

The original typo-like domain failed at fetch stage:

```text
www.exactautomation.com.y
```

The corrected Malaysia domain succeeded:

```text
www.exactautomation.com.my
```

Result:

```json
{
  "ok": true,
  "url": "https://www.exactautomation.com.my/",
  "title": "Exact Automation",
  "category": "industrial_automation",
  "relevance_score": 100
}
```

Status:

```text
PASS
```

### 5. Health after scan

Prompt:

```text
Check the health of my S22 Web Agent.
```

Result:

```json
{
  "ok": true,
  "service": "s22-web-agent",
  "runtime": "s22-termux"
}
```

Status:

```text
PASS
```

## Outcome

Phase 6 helper workflow passed.

The helper scripts successfully support the private OpenAI Secure MCP Tunnel mode while keeping the OpenAI runtime API key outside the repository.

Verified path:

```text
ChatGPT -> OpenAI Secure MCP Tunnel -> Debian tunnel-client -> Termux MCP HTTP 3003 -> API 3001 -> SQLite/report
```

## Follow-up Ideas

- Keep Route A Cloudflare and OpenAI Secure MCP Tunnel as separate access modes.
- Keep OAuth out of scope until a production-style auth layer is required.
- Consider a future cookie/session workflow for user-controlled login sessions.
- Avoid adding heavy scanner logic unless there is a clear need, to preserve S22 performance.
