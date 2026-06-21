# Route A: Cloudflare Named Tunnel

Route A ialah laluan production-shaped untuk expose S22 Web Agent kepada public melalui Cloudflare Named Tunnel.

Matlamat utama Route A:

- Expose hanya MCP HTTP endpoint.
- Kekalkan API dalaman pada port 3001 sebagai private.
- Kekalkan Playwright worker pada port 3002 sebagai private.
- Gunakan `MCP_HTTP_TOKEN` sebelum sebarang public exposure.
- Gunakan public hostname yang senang disebut dan senang diingat.

## Keputusan URL

Public hostname yang dicadangkan:

```text
s22agent.<your-domain>
```

MCP endpoint:

```text
https://s22agent.<your-domain>/mcp
```

Sebab pilih `s22agent`:

- Senang disebut melalui percakapan.
- Tidak perlu sebut “dash”.
- Senang ditaip.
- Senang diingat.
- Selari dengan nama projek: S22 Web Agent.
- Path `/mcp` sudah cukup untuk menunjukkan endpoint teknikal MCP.

Contoh percakapan:

```text
s22agent dot domain dot com slash mcp
```

Ini lebih mudah berbanding:

```text
mcp dash s22 dot domain dot com slash mcp
```

## Target architecture

```text
ChatGPT / MCP Inspector / curl
        |
        v
https://s22agent.<your-domain>/mcp
        |
        v
Cloudflare Named Tunnel
        |
        v
cloudflared on S22
        |
        v
http://127.0.0.1:3003/mcp
        |
        v
S22 MCP HTTP Server
```

## Internal-only services

Servis ini mesti kekal private pada S22:

```text
http://127.0.0.1:3001  Express API
http://127.0.0.1:3002  Playwright worker
```

Servis ini sahaja yang boleh dipublish melalui Cloudflare Tunnel:

```text
http://127.0.0.1:3003  MCP HTTP server
```

## Security rules

1. Jangan expose port 3001 kepada public.
2. Jangan expose port 3002 kepada public.
3. Hanya expose port 3003 melalui Cloudflare Tunnel.
4. Sentiasa set `MCP_HTTP_TOKEN` sebelum public access.
5. Jangan commit real tunnel token.
6. Jangan commit real bearer token.
7. Jangan commit domain secret atau credential.
8. Pastikan `.env` kekal dalam `.gitignore`.
9. Rotate `MCP_HTTP_TOKEN` selepas public demo.

## Cloudflare Named Tunnel setup

Cadangan tunnel name:

```text
s22-web-agent-mcp
```

Cadangan public hostname:

```text
s22agent.<your-domain>
```

Cadangan service mapping:

```text
Type: HTTP
URL: http://127.0.0.1:3003
```

Jangan tambah public route untuk:

```text
http://127.0.0.1:3001
http://127.0.0.1:3002
```

## Environment variables

Set variable ini secara local sahaja:

```bash
export MCP_HTTP_TOKEN="replace-with-strong-token"
export CLOUDFLARE_TUNNEL_TOKEN="replace-with-cloudflare-named-tunnel-token"
```

Nilai sebenar tidak boleh dimasukkan ke dalam Git.

## Runtime flow

Gunakan tiga session.

### Session 1: Start MCP HTTP server

```bash
cd ~/projects/mobile-job-radar-agent

export MCP_HTTP_TOKEN="replace-with-strong-token"

npm run mcp:http:start
npm run mcp:http:status
```

Expected local endpoint:

```text
http://127.0.0.1:3003/mcp
```

### Session 2: Start Cloudflare Named Tunnel

```bash
cd ~/projects/mobile-job-radar-agent

export CLOUDFLARE_TUNNEL_TOKEN="replace-with-cloudflare-named-tunnel-token"

npm run tunnel:named:start
```

Expected public endpoint:

```text
https://s22agent.<your-domain>/mcp
```

### Session 3: Test public MCP endpoint

Test tanpa token:

```bash
curl -i https://s22agent.<your-domain>/mcp
```

Expected result:

```text
401 Unauthorized
```

Test dengan token:

```bash
curl -i https://s22agent.<your-domain>/mcp \
  -H "Authorization: Bearer replace-with-strong-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"route-a-test"}}}'
```

Expected result:

```text
initialize success
```

## MCP Inspector test

Connection type:

```text
Streamable HTTP
```

URL:

```text
https://s22agent.<your-domain>/mcp
```

Header:

```text
Authorization: Bearer replace-with-strong-token
```

Expected result:

```text
MCP Inspector can initialize session and list tools.
```

## Acceptance criteria

Route A Named Tunnel dianggap berjaya apabila:

```text
[ ] MCP HTTP server runs locally on 127.0.0.1:3003
[ ] MCP_HTTP_TOKEN is required
[ ] Cloudflare Named Tunnel shows Healthy
[ ] Public hostname resolves
[ ] Public /mcp without token returns 401
[ ] Public /mcp with token returns initialize success
[ ] tools/list works through public hostname
[ ] MCP Inspector can connect through public hostname
[ ] API port 3001 is not publicly exposed
[ ] Playwright worker port 3002 is not publicly exposed
```

## Quick Tunnel vs Named Tunnel

Quick Tunnel masih berguna untuk demo sementara.

Named Tunnel ialah arah Route A yang lebih sesuai kerana:

- Public URL lebih stabil.
- Boleh guna domain atau subdomain sendiri.
- Lebih mudah dijelaskan dalam portfolio.
- Lebih production-shaped berbanding random Quick Tunnel URL.
- Cloudflare dashboard boleh menunjukkan tunnel status dan route configuration.

## Final Route A decision

Keputusan Route A:

```text
Use Cloudflare Named Tunnel.
Use public hostname: s22agent.<your-domain>
Use MCP endpoint: https://s22agent.<your-domain>/mcp
Expose only http://127.0.0.1:3003
Keep http://127.0.0.1:3001 private
Keep http://127.0.0.1:3002 private
Require MCP_HTTP_TOKEN before public exposure
```
