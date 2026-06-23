# Route A Live Test Results

This document records the successful Route A live test for S22 Web Agent.

Route A uses Cloudflare Named Tunnel to expose only the MCP HTTP endpoint while keeping internal services private.

## Public endpoint

```text
https://s22agent.aidesk.rest/mcp
Cloudflare route
s22agent.aidesk.rest -> Cloudflare Named Tunnel -> http://127.0.0.1:3003
Internal services

These services remain internal to the S22 device:

http://127.0.0.1:3001  Express API
http://127.0.0.1:3002  Playwright worker

Only MCP HTTP port 3003 is exposed through Cloudflare Tunnel.

Security check

Bearer authentication is required before public access is accepted.

Test without token:

curl https://s22agent.aidesk.rest/mcp

Expected result:

401 Unauthorized

Result:

PASS
MCP protocol checks

The following MCP protocol checks passed through the public Cloudflare Named Tunnel endpoint.

initialize                  -> 200 OK
notifications/initialized   -> 202 Accepted
tools/list                  -> 200 OK

Result:

PASS
API-backed tool check

Tool tested:

job_radar_health

Result:

PASS

The tool returned:

ok: true
service: s22-web-agent
runtime: s22-termux
dbPath: data/radar.db

This confirms the public MCP endpoint can reach the internal Express API on port 3001.

End-to-end scan check

Tool tested:

job_radar_scan

Input:

example.com

Result:

PASS

Returned scan result:

ok: true
url: https://example.com/
title: Example Domain
category: unknown
relevance_score: 15
outputPath: reports/last-scan.json
dbPath: data/radar.db

This confirms the full live path:

PC curl
-> Cloudflare DNS
-> Cloudflare Named Tunnel
-> S22 MCP HTTP server on port 3003
-> internal Express API on port 3001
-> scanner
-> SQLite/report output
MCP Inspector

MCP Inspector public URL test was skipped for now.

Reason:

curl-based MCP protocol tests already proved the public route, authentication, session flow, tools/list, and tools/call execution.

MCP Inspector remains optional for a later visual demo.

Token handling

No MCP token, Cloudflare tunnel token, or session id should be stored in this document.

The temporary MCP token used during testing must be rotated before future public demos.

Final status
Route A public Named Tunnel: PASS
Route A end-to-end scan through public MCP endpoint: PASS
MCP Inspector: optional / skipped

