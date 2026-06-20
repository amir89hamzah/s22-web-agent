# Run Public Tunnel Demo

This guide shows how to run the S22 Web Agent MCP HTTP server through a safe Cloudflare Quick Tunnel.

## Safety rule

Only expose MCP HTTP port 3003.

Do not expose:

- API server port 3001
- Playwright worker port 3002

The public tunnel must target:

~~text
http://127.0.0.1:3003
~~

## Session layout

Use three SSH sessions.

~~text
Session 1 = start MCP HTTP server and manage token
Session 2 = start Cloudflare tunnel
Session 3 = test with curl or MCP Inspector
~~

## Session 1 — Start MCP HTTP server

Go to the repo:

~~bash
cd ~/projects/mobile-job-radar-agent
~~

Create or rotate the token:

~~bash
mkdir -p .runtime
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" > .runtime/mcp-http-token
export MCP_HTTP_TOKEN="$(cat .runtime/mcp-http-token)"
~~

Start MCP HTTP server:

~~bash
npm run mcp:http:stop
MCP_HTTP_TOKEN="$MCP_HTTP_TOKEN" npm run mcp:http:start
npm run mcp:http:status
~~

Expected status:

~~text
Process: running
Port: 3003
auth: enabled
~~

## Session 2 — Start Cloudflare Quick Tunnel

Open another SSH session.

~~bash
cd ~/projects/mobile-job-radar-agent
export MCP_HTTP_TOKEN="$(cat .runtime/mcp-http-token)"
npm run tunnel:cloudflare
~~

Expected output:

~~text
Your quick Tunnel has been created!
https://xxxxx.trycloudflare.com
~~

Public MCP endpoint:

~~text
https://xxxxx.trycloudflare.com/mcp
~~

Keep this session running.

## Session 3 — Test local MCP initialize

Open another SSH session.

~~bash
cd ~/projects/mobile-job-radar-agent
export MCP_HTTP_TOKEN="$(cat .runtime/mcp-http-token)"
~~

Test local MCP initialize:

~~bash
curl -i -s -X POST http://127.0.0.1:3003/mcp \
  -H "authorization: Bearer $MCP_HTTP_TOKEN" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  --data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "0.1.0"
      }
    }
  }'
~~

Expected result:

~~text
HTTP/1.1 200 OK
mcp-session-id: ...
serverInfo: s22-web-agent
~~

## Session 3 — Test public MCP initialize

Replace the URL with the real Cloudflare URL from Session 2.

~~bash
curl -i -s -X POST https://xxxxx.trycloudflare.com/mcp \
  -H "authorization: Bearer $MCP_HTTP_TOKEN" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  --data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "0.1.0"
      }
    }
  }'
~~

Expected result:

~~text
HTTP/2 200
server: cloudflare
mcp-session-id: ...
serverInfo: s22-web-agent
~~

## MCP Inspector setup

Use the public MCP endpoint:

~~text
https://xxxxx.trycloudflare.com/mcp
~~

Add this header:

~~text
Authorization: Bearer <token from .runtime/mcp-http-token>
~~

Then test:

~~text
job_radar_health
job_radar_scan
~~

## Shutdown steps

Stop the tunnel:

~~text
Session 2: Ctrl+C
~~

Stop MCP HTTP server:

~~bash
npm run mcp:http:stop
~~

## Token rotation rule

Rotate the token when:

- the token appears in screenshots
- the token appears in chat logs
- the token is shared by mistake
- a public demo session is finished

Rotate token:

~~bash
cd ~/projects/mobile-job-radar-agent
mkdir -p .runtime
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" > .runtime/mcp-http-token
export MCP_HTTP_TOKEN="$(cat .runtime/mcp-http-token)"
npm run mcp:http:stop
MCP_HTTP_TOKEN="$MCP_HTTP_TOKEN" npm run mcp:http:start
~~

Never commit real tokens.
