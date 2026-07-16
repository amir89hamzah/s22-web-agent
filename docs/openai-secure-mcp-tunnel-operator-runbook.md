# OpenAI Secure MCP Tunnel operator runbook

## Current recommended stable workflow

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:start
npm run openai:tunnel:client:start:stable
```

Enter the runtime key through the hidden prompt. After connection, detach with `Ctrl+b`, release the keys, then press `d`. Closing SSH after detaching does not terminate the tunnel-client.

Status:

```bash
npm run openai:tunnel:client:status:stable
npm run openai:tunnel:status
```

Stop everything:

```bash
npm run openai:tunnel:client:stop:stable
npm run openai:tunnel:stop
npm run worker:stop:stable
npm run session:vnc:stop:stable
```

See `docs/operator-quickstart.md` for the short operator reference.

This runbook is for the private OpenAI Secure MCP Tunnel mode of S22 Web Agent.

## Scope

Use this mode for Phase 6 ChatGPT Custom App integration. Do not use this runbook for Route A Cloudflare public tunnel mode.

## Architecture

```text
ChatGPT Custom App
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client inside Debian proot
  -> Termux MCP HTTP on 127.0.0.1:3003/mcp
  -> Termux API on 127.0.0.1:3001
  -> SQLite/report files
```

## Security boundary

- Do not expose API `3001` publicly.
- Do not expose Playwright worker `3002` publicly.
- Do not expose MCP HTTP `3003` through Cloudflare in this mode.
- Keep `MCP_HTTP_TOKEN` unset so local MCP HTTP auth is disabled for the OpenAI tunnel path.
- Keep `tunnel-client` inside Debian proot because direct Termux execution previously failed with `unexpected e_type: 2`.
- Do not commit or paste `CONTROL_PLANE_API_KEY`, tunnel runtime keys, or any other secret.

## Known-good values

```text
OpenAI tunnel profile: s22-web-agent-local
Debian tunnel-client path: /data/data/com.termux/files/home/tools/openai-tunnel/tunnel-client
Local MCP target: http://127.0.0.1:3003/mcp
```

## Start runtime

### Terminal 1 — Termux local services

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:start
```

Expected:

```text
API 3001 running
MCP HTTP 3003 running
MCP HTTP auth: disabled
cloudflared: not running
```

### Terminal 2 — Debian proot tunnel-client

```bash
proot-distro login debian
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
npm run openai:tunnel:client:debian
```

The Debian helper will ask for the OpenAI runtime API key if `CONTROL_PLANE_API_KEY` is not already set. Do not paste placeholder text. Paste the real OpenAI runtime API key when prompted.

Keep this terminal open while testing from ChatGPT.

## About OAuth metadata fail

For Phase 6, OAuth is intentionally out of scope.

This check may fail:

```text
oauth_metadata FAIL HTTP 404
```

That is acceptable for this non-OAuth phase if these checks pass:

```text
control_plane_api_key PASS
mcp_target PASS
mcp_server_reachable PASS
health_listener PASS
ui PASS
```

Do not ignore repeated runtime errors like:

```text
401 Unauthorized
poll failed
controlplane
```

That means the runtime key or tunnel authorization is wrong, expired, or not accepted by OpenAI control plane.

## ChatGPT Custom App checks

After the Debian tunnel-client is running, test from ChatGPT Custom App:

1. Health check.
2. List saved pages.
3. Scan `example.com`.
4. Health check again.

## Status

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:status
```

## Stop runtime

1. Press `Ctrl+C` in the Debian proot terminal running `tunnel-client`.
2. Return to Termux.
3. Stop local services:

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:stop
```

## Route A reminder

Do not start Route A for this mode.

```bash
# Do not use for this mode
npm run route:a:start
```

If Route A was accidentally started:

```bash
npm run route:a:stop
npm run openai:tunnel:start
```
