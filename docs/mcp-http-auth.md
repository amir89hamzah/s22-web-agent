# MCP HTTP Bearer Auth

The S22 Web Agent MCP HTTP server supports optional bearer-token authentication.

This is required before exposing the MCP HTTP endpoint through a public tunnel.

## Default local mode

Auth is disabled by default for local and LAN development.

Start MCP HTTP without auth:

    npm run mcp:http:start

Check status:

    npm run mcp:http:status

Stop server:

    npm run mcp:http:stop

In this mode, the health response shows:

    "auth": "disabled"

## Auth-enabled mode

Set MCP_HTTP_TOKEN before starting the server:

    MCP_HTTP_TOKEN=local-dev-token npm run mcp:http:start

In this mode, the health response shows:

    "auth": "enabled"

The /mcp endpoint requires this HTTP header:

    Authorization: Bearer local-dev-token

The /health endpoint remains public so the runtime can be checked easily.

## Expected auth behavior

When auth is enabled:

1. Request to /mcp without token should return:

    HTTP/1.1 401 Unauthorized

2. Request to /mcp with the correct bearer token should return:

    HTTP/1.1 200 OK

3. The initialize response should include an mcp-session-id header.

4. Follow-up MCP requests must include both:
   - Authorization: Bearer local-dev-token
   - mcp-session-id: <session-id>

## Curl test: unauthorized initialize

This should fail with 401 Unauthorized:

    curl -i -X POST http://127.0.0.1:3003/mcp \
      -H 'content-type: application/json' \
      -H 'accept: application/json, text/event-stream' \
      -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"auth-test","version":"0.1.0"}}}'

## Curl test: authorized initialize

This should return 200 OK and an mcp-session-id header:

    curl -s -D .runtime/mcp-auth-init.headers -o .runtime/mcp-auth-init.body \
      -X POST http://127.0.0.1:3003/mcp \
      -H 'authorization: Bearer local-dev-token' \
      -H 'content-type: application/json' \
      -H 'accept: application/json, text/event-stream' \
      -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"auth-test","version":"0.1.0"}}}'

Extract the session ID:

    SESSION_ID=$(grep -i '^mcp-session-id:' .runtime/mcp-auth-init.headers | awk '{print $2}' | tr -d '\r')
    echo "SESSION_ID=$SESSION_ID"

Send initialized notification:

    curl -i -X POST http://127.0.0.1:3003/mcp \
      -H 'authorization: Bearer local-dev-token' \
      -H 'content-type: application/json' \
      -H 'accept: application/json, text/event-stream' \
      -H 'mcp-protocol-version: 2025-06-18' \
      -H "mcp-session-id: $SESSION_ID" \
      -d '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}'

List tools:

    curl -i -X POST http://127.0.0.1:3003/mcp \
      -H 'authorization: Bearer local-dev-token' \
      -H 'content-type: application/json' \
      -H 'accept: application/json, text/event-stream' \
      -H 'mcp-protocol-version: 2025-06-18' \
      -H "mcp-session-id: $SESSION_ID" \
      -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

Expected tools include:

    job_radar_health
    job_radar_list_pages
    job_radar_get_page
    job_radar_scan
    job_radar_get_report
    browser_inspect_url
    browser_scan_url

## MCP Inspector over LAN

Start the MCP HTTP server with auth:

    MCP_HTTP_TOKEN=local-dev-token npm run mcp:http:start

In MCP Inspector on PC:

    Transport Type: Streamable HTTP
    URL: http://<S22-IP>:3003/mcp
    Connection Type: Via Proxy
    Authentication: Bearer token
    Token: local-dev-token

Example LAN URL:

    http://192.168.100.178:3003/mcp

## Security notes

Do not commit real tokens.

Use local-dev-token only for local testing.

Before exposing the MCP HTTP server through a public tunnel, always enable MCP_HTTP_TOKEN and use a stronger token.
