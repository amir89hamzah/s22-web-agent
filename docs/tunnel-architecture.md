# Tunnel Architecture

Goal: expose only the MCP Streamable HTTP endpoint through a public tunnel.

## Public path

Internet client
-> public HTTPS tunnel URL
-> tunnel client on S22
-> http://127.0.0.1:3003/mcp
-> MCP HTTP server

## Private/internal services

Do not expose these through tunnel:

- API server: 3001
- Playwright worker: 3002

The MCP HTTP server may call internal services locally, but the public tunnel must only target port 3003.

## Safety rules

1. Always set MCP_HTTP_TOKEN before starting a public tunnel.
2. Do not use local-dev-token for public tunnel testing.
3. Tunnel target must be http://127.0.0.1:3003.
4. Never tunnel 3001 or 3002.
5. Do not commit real tokens.
