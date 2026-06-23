# Route A Operator Runbook

This runbook is the day-to-day operating guide for S22 Web Agent Route A.

Route A exposes only the MCP HTTP server through Cloudflare Named Tunnel.

## Public endpoint

```text
https://s22agent.aidesk.rest/mcp
Route boundary
Public:
s22agent.aidesk.rest -> Cloudflare Named Tunnel -> http://127.0.0.1:3003

Private:
http://127.0.0.1:3001  Express API
http://127.0.0.1:3002  Playwright worker

Do not expose ports 3001 or 3002 publicly.

Secrets

There are two different tokens:

MCP_HTTP_TOKEN
- Created by the operator.
- Used by curl, MCP Inspector, or MCP clients.
- Sent as Authorization: Bearer <token>.

CLOUDFLARE_TUNNEL_TOKEN
- Created by Cloudflare.
- Used only by cloudflared to connect the Named Tunnel.

Do not paste real tokens into chat, screenshots, Git, or documentation.

1. SSH from Windows PowerShell
ssh u_a328@192.168.100.178 -p 8022

If the IP changes, check the S22 IP address again.

2. Check repository
cd ~/projects/mobile-job-radar-agent
git status --short
git branch --show-current
git log --oneline -5

Expected:

Branch: main
Working tree: clean
3. Start internal API on port 3001
cd ~/projects/mobile-job-radar-agent

npm run api:start
npm run api:status

Direct local check:

curl -s http://127.0.0.1:3001/health

Expected:

ok: true
service: s22-web-agent
runtime: s22-termux
4. Create a new MCP token

Generate a new token:

node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

Copy the generated value into a private note.

Do not paste the token into chat.

5. Start MCP HTTP on port 3003

Paste the token safely:

read -s -p "Paste new MCP token: " MCP_HTTP_TOKEN
echo
export MCP_HTTP_TOKEN

Start MCP HTTP:

npm run mcp:http:start
npm run mcp:http:status

Local no-token check:

curl -i -sS http://127.0.0.1:3003/mcp

Expected when auth is active:

401 Unauthorized
6. Start Cloudflare Named Tunnel

Use a separate SSH session for the tunnel.

cd ~/projects/mobile-job-radar-agent

Paste the Cloudflare tunnel token safely:

read -s -p "Paste Cloudflare tunnel token: " CLOUDFLARE_TUNNEL_TOKEN
echo
export CLOUDFLARE_TUNNEL_TOKEN

Start tunnel:

npm run tunnel:named:start

Keep this session open while testing.

7. Public no-token test from Windows PowerShell
curl.exe -i "https://s22agent.aidesk.rest/mcp"

Expected:

401 Unauthorized

This confirms:

PC -> Cloudflare -> Named Tunnel -> S22 MCP HTTP 3003
8. Store MCP token in PowerShell session

Use Windows PowerShell:

$secure = Read-Host "Paste MCP token" -AsSecureString
$TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)

When PowerShell shows:

Paste MCP token:

paste the MCP token.

9. Initialize MCP session

Create JSON without BOM:

'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"route-a-operator"}}}' | Out-File -FilePath init.json -Encoding ascii -NoNewline

Send initialize:

curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  --data-binary "@init.json"

Expected:

HTTP/1.1 200 OK
Mcp-Session-Id: <session-id>

Copy the Mcp-Session-Id value.

Set it in PowerShell:

$SESSION_ID = "<paste-session-id-here>"
10. Send initialized notification
'{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' | Out-File -FilePath initialized.json -Encoding ascii -NoNewline
curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@initialized.json"

Expected:

HTTP/1.1 202 Accepted
11. List MCP tools
'{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | Out-File -FilePath tools-list.json -Encoding ascii -NoNewline
curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@tools-list.json"

Expected tools include:

job_radar_health
job_radar_list_pages
job_radar_get_page
job_radar_scan
job_radar_get_report
browser_inspect_url
browser_scan_url
12. Test job_radar_health
'{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"job_radar_health","arguments":{}}}' | Out-File -FilePath health-tool.json -Encoding ascii -NoNewline
curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@health-tool.json"

Expected:

ok: true
service: s22-web-agent
runtime: s22-termux

If the result says fetch failed, the internal API on port 3001 is probably not running.

13. Test job_radar_scan
'{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"job_radar_scan","arguments":{"url":"example.com"}}}' | Out-File -FilePath scan-example.json -Encoding ascii -NoNewline
curl.exe -i "https://s22agent.aidesk.rest/mcp" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: $SESSION_ID" `
  --data-binary "@scan-example.json"

Expected:

ok: true
url: https://example.com/
title: Example Domain
category: unknown
relevance_score: 15
outputPath: reports/last-scan.json
dbPath: data/radar.db
14. Optional MCP Inspector

MCP Inspector public URL test is optional.

Use only if Node.js and npx are available on the PC.

npx @modelcontextprotocol/inspector

Connection:

Transport: Streamable HTTP
URL: https://s22agent.aidesk.rest/mcp
Header: Authorization: Bearer <MCP_HTTP_TOKEN>

If npx is not available, skip MCP Inspector and use curl-based proof.

15. Shutdown

Stop Cloudflare tunnel.

If the tunnel session is still open:

Ctrl + C

If needed:

pkill -f cloudflared
pgrep -af cloudflared

Stop MCP HTTP and API:

cd ~/projects/mobile-job-radar-agent

npm run mcp:http:stop
npm run api:stop

npm run mcp:http:status
npm run api:status

Final repo check:

git status --short

Expected:

Working tree clean
16. Troubleshooting guide
curl public URL returns 401:
Good. Auth is active.

curl public URL cannot resolve host:
DNS or Cloudflare public hostname issue.

curl public URL returns Cloudflare bad gateway:
cloudflared tunnel or MCP HTTP server is not running.

initialize returns JSON parse error:
PowerShell JSON file may contain BOM.
Use Out-File -Encoding ascii -NoNewline.

tools/call returns fetch failed:
MCP server is running but API 3001 is not reachable.

npx not recognized:
Node.js/npx is not installed on the PC.
Skip MCP Inspector or install Node.js.
17. Security reminder

Before public demos:

Rotate MCP_HTTP_TOKEN.
Do not expose API 3001.
Do not expose Playwright worker 3002.
Do not commit .env.
Do not store third-party usernames or passwords in this project.

