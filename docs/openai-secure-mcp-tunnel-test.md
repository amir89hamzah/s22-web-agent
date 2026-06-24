# OpenAI Secure MCP Tunnel Test

This document records the Phase 5 spike for connecting ChatGPT to S22 Web Agent through OpenAI Secure MCP Tunnel.

The goal was to prove that ChatGPT can reach the S22 Web Agent MCP tools without exposing the MCP server through a public Cloudflare URL.

## Objective

Validate this path:

```text
ChatGPT Custom App
        |
        v
OpenAI Secure MCP Tunnel
        |
        v
tunnel-client running inside Debian proot on Samsung S22
        |
        v
Termux MCP HTTP server on http://127.0.0.1:3003/mcp
        |
        v
S22 Web Agent API on http://127.0.0.1:3001
        |
        v
SQLite database + generated reports
```

This is separate from Route A.

Route A uses:

```text
ChatGPT or curl -> Cloudflare Named Tunnel -> https://s22agent.aidesk.rest/mcp
```

Phase 5 uses:

```text
ChatGPT -> OpenAI Secure MCP Tunnel -> local tunnel-client -> local MCP HTTP server
```

## Key Decision

For this spike, do not run Route A.

Do not run:

```bash
npm run route:a:start
```

Phase 5 uses the OpenAI tunnel, not the Cloudflare Named Tunnel.

The required runtime for this test is:

```text
Termux:
- API server on port 3001
- MCP HTTP server on port 3003 with auth disabled

Debian proot:
- tunnel-client run --profile s22-web-agent-local
```

## Security Boundary

The following rules were followed:

- Cloudflare Named Tunnel was not started.
- Public Route A endpoint was not used.
- API port `3001` was not exposed publicly.
- Playwright worker port `3002` was not exposed publicly.
- MCP HTTP port `3003` was used only locally by `tunnel-client`.
- OpenAI runtime API key was not committed.
- Tunnel ID was not committed in full.
- MCP HTTP auth was disabled only for this local OpenAI tunnel test.
- Runtime was stopped after testing.

## Tunnel Setup

OpenAI Platform tunnel record:

```text
Name: s22-web-agent-local
Description: Secure MCP tunnel for S22 Web Agent local MCP HTTP server on Samsung S22 Termux.
Workspace: Personal workspace
```

Tunnel ID was copied locally into the Debian proot shell but is intentionally not recorded here.

## tunnel-client Runtime

The `tunnel-client` binary was downloaded from the OpenAI GitHub release:

```text
tunnel-client-v0.0.9--context-conduit-topaz-linux-arm64.zip
```

Termux direct execution failed with:

```text
unexpected e_type: 2
```

This showed that the Linux arm64 binary was not directly executable in the Termux Android environment.

The same binary worked inside Debian proot:

```text
tunnel-client --version
0.0.9+62b9b42f698ec5319d2115e0c0ff1dcf6557d7ae
```

Therefore the Phase 5 runtime uses Debian proot for `tunnel-client`.

## tunnel-client Profile

Profile created inside Debian proot:

```bash
tunnel-client init \
  --sample sample_mcp_remote_no_auth \
  --profile s22-web-agent-local \
  --tunnel-id tunnel_******** \
  --mcp-server-url http://127.0.0.1:3003/mcp
```

Profile path:

```text
/root/.config/tunnel-client/s22-web-agent-local.yaml
```

Profile list confirmed:

```text
s22-web-agent-local     /root/.config/tunnel-client/s22-web-agent-local.yaml
```

## Local MCP Reachability

Termux MCP HTTP server was started with `MCP_HTTP_TOKEN` unset:

```bash
unset MCP_HTTP_TOKEN
npm run mcp:http:start
npm run mcp:http:status
```

Expected MCP HTTP status:

```text
auth: disabled
```

Debian proot reached the Termux MCP HTTP health endpoint successfully:

```text
GET http://127.0.0.1:3003/health
HTTP/1.1 200 OK
```

Debian proot also initialized an MCP session successfully:

```text
HTTP/1.1 200 OK
mcp-session-id: <session-id>
serverInfo.name: s22-web-agent
```

## tunnel-client Doctor

`tunnel-client doctor` confirmed the key pieces:

```text
CHECK config_source            PASS
CHECK profile_load             PASS
CHECK tunnel_id                PASS
CHECK control_plane_api_key    PASS
CHECK mcp_target               PASS http://127.0.0.1:3003/mcp
CHECK mcp_server_reachable     PASS
CHECK health_listener          PASS will bind http://127.0.0.1:8080
CHECK ui                       PASS http://127.0.0.1:8080/ui
```

The OAuth metadata check failed:

```text
CHECK oauth_metadata           FAIL
```

This was expected for the no-auth local tunnel spike because the S22 MCP HTTP server does not currently expose OAuth protected resource metadata.

The test continued because the local MCP target was reachable and the selected sample was `sample_mcp_remote_no_auth`.

## tunnel-client Run

`tunnel-client` was started with:

```bash
tunnel-client run --profile s22-web-agent-local
```

Health checks from another Debian proot session passed:

```text
GET http://127.0.0.1:8080/healthz
HTTP/1.1 200 OK
live
```

```text
GET http://127.0.0.1:8080/readyz
HTTP/1.1 200 OK
ready
```

```text
GET http://127.0.0.1:8080/ui
HTTP/1.1 200 OK
```

Important startup log result:

```text
mcp session initialized
server_name: s22-web-agent
server_version: 0.1.0
```

The tunnel-client also reported:

```text
tunnel-client started
name: s22-web-agent-local
mcp_target_value: http://127.0.0.1:3003/mcp
```

## ChatGPT Custom App Test

A ChatGPT Custom App named `S22 Web Agent` was connected through the OpenAI tunnel.

Connection mode:

```text
Tunnel
```

Authentication mode:

```text
No Auth
```

Selected tunnel:

```text
s22-web-agent-local
```

## Test Results

### 1. Health Check

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

### 2. Scan example.com

Prompt:

```text
Use S22 Web Agent to scan example.com.
```

Result:

```json
{
  "ok": true,
  "url": "https://example.com/",
  "title": "Example Domain",
  "category": "unknown",
  "relevance_score": 15,
  "notes": "No strong keyword match found."
}
```

Generated outputs:

```text
reports/last-scan.json
data/radar.db
```

Status:

```text
PASS
```

### 3. List Saved Pages

Prompt:

```text
Use S22 Web Agent to list saved pages.
```

Result:

```text
Saved pages listed successfully.
Entries included https://example.com/ with title Example Domain.
```

Status:

```text
PASS
```

### 4. Yaskawa Solution Center URL

Prompt:

```text
Use S22 Web Agent to scan https://solutioncenter.yaskawa.com/search/documents/11185
```

Result:

```text
Browser scan failed: fetch failed
Normal scan failed: API 500 / upstream HTTP 404
```

The agent health check still passed afterward.

Interpretation:

```text
The S22 Web Agent remained healthy.
The target URL itself was not directly scannable through the current static scanner/browser-worker path.
The page may require login, session state, a browser route, or a different canonical URL.
```

Status:

```text
EXPECTED LIMITATION / NON-BLOCKING
```

## Final Runtime Shutdown

After testing, the runtime was stopped.

Termux status:

```text
MCP HTTP:
Process: no PID file
Health: not reachable

API:
Process: no PID file
Health: not reachable
```

Route A status:

```text
cloudflared is not running
```

The Cloudflare public endpoint returned `HTTP 530`, which is expected when the Cloudflare Named Tunnel is not running.

## Outcome

Phase 5 passed.

ChatGPT successfully reached the S22 Web Agent through OpenAI Secure MCP Tunnel and executed MCP tools against the local S22 runtime.

Verified path:

```text
ChatGPT
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client in Debian proot
  -> Termux MCP HTTP server on 3003
  -> S22 Web Agent API on 3001
  -> SQLite/report outputs
```

## Follow-up Ideas

Possible next steps:

- Add a helper runbook for OpenAI Secure MCP Tunnel mode.
- Add a safer start/stop helper for Phase 5 runtime.
- Add a README section summarizing Route B / OpenAI Tunnel result.
- Improve browser worker integration before testing JavaScript-heavy websites.
- Add OAuth metadata support later if ChatGPT Server URL mode is needed.
- Keep Route A and OpenAI Tunnel as separate access patterns.

