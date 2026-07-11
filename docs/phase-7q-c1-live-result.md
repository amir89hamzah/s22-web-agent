# Phase 7Q-C1 — Live Shared-Tunnel Token Rotation Result

## Result

PASS on the Samsung S22 on 11 July 2026.

## Evidence

Cloudflare dashboard:

```text
Tunnel: s22-web-agent-mcp
Active replicas: 1
Routes: 2
Status: Healthy
Architecture: android_arm64
```

S22 runtime while Route A was active:

```text
API 3001: running and healthy
MCP HTTP 3003: running and healthy
MCP authentication: bearer token enabled
cloudflared: running
cloudflared command line: suppressed
public MCP request without token: HTTP 401 Unauthorized
login hostname without Access session: HTTP 302
Git working tree: clean
```

After the operator stopped Route A:

```text
API: stopped
MCP HTTP: stopped
cloudflared: stopped
public hostname without connector: Cloudflare 530 / tunnel error 1033
Git working tree: clean
```

The post-stop Cloudflare 530/1033 response was expected because the published hostname remained configured while no connector was active.

## Security conclusions

- The historical tunnel token was rotated in the Cloudflare dashboard.
- The rotated token was accepted by the S22 `android_arm64` connector.
- The old helper behavior that could display the cloudflared command line was removed before verification.
- No tunnel token, MCP bearer token, website credential, cookie, MFA value, or storageState content was printed.
- `s22agent.aidesk.rest` and `s22login.aidesk.rest` remained separate services on one shared connector.
- Cloudflare Access remained in front of the login hostname.

## Network-listener decision

The project will retain the ability to bind MCP HTTP to `0.0.0.0` for trusted LAN and future field-agent use. Non-loopback startup now requires a non-empty MCP bearer token at both the shell wrapper and Node server layers.
