# Route A Operator Runbook

This runbook is the day-to-day operating guide for S22 Web Agent Route A.

Route A exposes only the MCP HTTP server through Cloudflare Named Tunnel.

## Public endpoint

```text
https://s22agent.aidesk.rest/mcp
```

## Route boundary

Public:

```text
s22agent.aidesk.rest -> Cloudflare Named Tunnel -> http://127.0.0.1:3003
```

Private:

```text
http://127.0.0.1:3001  Express API
http://127.0.0.1:3002  Playwright worker
```

Do not expose ports `3001` or `3002` publicly.

## Secrets

There are two different tokens.

`MCP_HTTP_TOKEN`

- Created by the operator.
- Used by curl, MCP Inspector, or MCP clients.
- Sent as `Authorization: Bearer <token>`.

`CLOUDFLARE_TUNNEL_TOKEN`

- Created by Cloudflare.
- Used only by `cloudflared` to connect the Named Tunnel.

Do not paste real tokens into chat, screenshots, Git, or documentation.

## Running commands from any directory

After SSH login, `npm run ...` works only when the terminal is inside the repo folder because npm needs to find `package.json`.

Recommended normal flow:

```bash
cd ~/projects/mobile-job-radar-agent
npm run route:a:status
```

Alternative from any directory:

```bash
npm --prefix ~/projects/mobile-job-radar-agent run route:a:status
npm --prefix ~/projects/mobile-job-radar-agent run route:a:start
npm --prefix ~/projects/mobile-job-radar-agent run route:a:stop
```

The helper scripts themselves self-locate the repository root internally, but `npm run` must still be pointed to the project folder.

## 1. SSH from Windows PowerShell

```powershell
ssh u_a328@192.168.100.178 -p 8022
```

If the IP changes, check the S22 IP address again.

## 2. Check repository

```bash
cd ~/projects/mobile-job-radar-agent
git status --short
git branch --show-current
git log --oneline -5
```

Expected:

```text
Branch: main
Working tree: clean
```

## 3. One-command Route A start

For normal day-to-day operation, use the bundled Route A helper:

```bash
cd ~/projects/mobile-job-radar-agent
npm run route:a:start
```

Or from any directory:

```bash
npm --prefix ~/projects/mobile-job-radar-agent run route:a:start
```

The helper will:

- Show the public MCP URL
- Show the security boundary
- Prompt for `MCP_HTTP_TOKEN`
- Prompt for `CLOUDFLARE_TUNNEL_TOKEN`
- Start the internal API on port `3001`
- Start MCP HTTP on port `3003`
- Confirm local no-token request returns `401 Unauthorized`
- Start the Cloudflare Named Tunnel

Keep the Route A terminal open while testing.

## 4. Check Route A status

From the repo folder:

```bash
npm run route:a:status
```

Or from any directory:

```bash
npm --prefix ~/projects/mobile-job-radar-agent run route:a:status
```

Expected when Route A is running:

```text
API 3001: reachable
MCP HTTP 3003: reachable
cloudflared: running
```

Expected MCP HTTP health output includes:

```text
auth: enabled
```

## 5. Public no-token test from Windows PowerShell

```powershell
curl.exe -i "https://s22agent.aidesk.rest/mcp"
```

Expected:

```text
401 Unauthorized
```

This confirms:

```text
PC -> Cloudflare -> Named Tunnel -> S22 MCP HTTP 3003
```

## 6. Store MCP token in PowerShell session

Use Windows PowerShell:

```powershell
$secure = Read-Host "Paste MCP token" -AsSecureString
$TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)
```

When PowerShell shows:

```text
Paste MCP token:
```

paste the MCP token.

Do not paste the token into chat.

## 7. Initialize MCP session

Create JSON without BOM:

```powershell
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"route-a-operator"}}}' | Out-File -FilePath init.json -Encoding ascii -NoNewline
```

Send initialize:

```powershell
curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  --data-binary "@init.json"
```

Expected:

```text
HTTP/1.1 200 OK
Mcp-Session-Id: <session-id>
```

Copy the `Mcp-Session-Id` value.

Set it in PowerShell:

```powershell
$SESSION_ID = "<paste-session-id-here>"
```

## 8. Send initialized notification

```powershell
'{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' | Out-File -FilePath initialized.json -Encoding ascii -NoNewline

curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@initialized.json"
```

Expected:

```text
HTTP/1.1 202 Accepted
```

## 9. List MCP tools

```powershell
'{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | Out-File -FilePath tools-list.json -Encoding ascii -NoNewline

curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@tools-list.json"
```

Expected tools include:

```text
job_radar_health
job_radar_list_pages
job_radar_get_page
job_radar_scan
job_radar_get_report
browser_inspect_url
browser_scan_url
```

## 10. Test job_radar_health

```powershell
'{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"job_radar_health","arguments":{}}}' | Out-File -FilePath health-tool.json -Encoding ascii -NoNewline

curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@health-tool.json"
```

Expected:

```text
ok: true
service: s22-web-agent
runtime: s22-termux
```

If the result says fetch failed, the internal API on port `3001` is probably not running.

## 11. Test job_radar_scan

```powershell
'{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"job_radar_scan","arguments":{"url":"example.com"}}}' | Out-File -FilePath scan-example.json -Encoding ascii -NoNewline

curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@scan-example.json"
```

Expected:

```text
ok: true
url: https://example.com/
title: Example Domain
category: unknown
relevance_score: 15
outputPath: reports/last-scan.json
dbPath: data/radar.db
```

## 12. Optional MCP Inspector

MCP Inspector public URL test is optional.

Use only if Node.js and `npx` are available on the PC.

```bash
npx @modelcontextprotocol/inspector
```

Connection:

```text
Transport: Streamable HTTP
URL: https://s22agent.aidesk.rest/mcp
Header: Authorization: Bearer <MCP_HTTP_TOKEN>
```

If `npx` is not available, skip MCP Inspector and use curl-based proof.

## 13. Shutdown

Stop Route A from the repo folder:

```bash
cd ~/projects/mobile-job-radar-agent
npm run route:a:stop
```

Or from any directory:

```bash
npm --prefix ~/projects/mobile-job-radar-agent run route:a:stop
```

This stops:

- Cloudflare tunnel
- MCP HTTP server
- Internal API server

Confirm status:

```bash
npm --prefix ~/projects/mobile-job-radar-agent run route:a:status
```

Expected after shutdown:

```text
cloudflared: not running
MCP HTTP: not reachable
API: not reachable
```

## 14. Manual fallback commands

Use these only if the bundled Route A helper is not being used.

Start API:

```bash
cd ~/projects/mobile-job-radar-agent
npm run api:start
npm run api:status
```

Create a new MCP token:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Copy the generated value into a private note.

Do not paste the token into chat.

Paste the token safely:

```bash
read -s -p "Paste new MCP token: " MCP_HTTP_TOKEN
echo
export MCP_HTTP_TOKEN
```

Start MCP HTTP:

```bash
npm run mcp:http:start
npm run mcp:http:status
```

Local no-token check:

```bash
curl -i -sS http://127.0.0.1:3003/mcp
```

Expected when auth is active:

```text
401 Unauthorized
```

Paste the Cloudflare tunnel token safely:

```bash
read -s -p "Paste Cloudflare tunnel token: " CLOUDFLARE_TUNNEL_TOKEN
echo
export CLOUDFLARE_TUNNEL_TOKEN
```

Start Named Tunnel:

```bash
npm run tunnel:named:start
```

