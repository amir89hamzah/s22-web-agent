# Phase 7Q-C1 — Controlled Shared-Tunnel Token Rotation

## Status

Cloudflare dashboard token rotation completed on 11 July 2026 for the remotely managed tunnel:

```text
s22-web-agent-mcp
```

The dashboard confirmed that the previous connector token was invalidated and a new token was generated. Live S22 connector verification with the new token is pending.

## Architecture preserved

The same remotely managed tunnel carries two separate published applications:

```text
s22agent.aidesk.rest -> http://127.0.0.1:3003
s22login.aidesk.rest -> http://127.0.0.1:6080
```

Cloudflare Access protects `s22login.aidesk.rest` with an exact-email Allow policy and a 30-minute application session.

## Security fix before verification

The legacy Route A status and stop helpers previously printed `pgrep -af cloudflared`, which could expose the process command line and therefore tunnel token material.

Phase 7Q-C1 hardens them so they report only:

- whether cloudflared is running
- the process count
- that the command line is suppressed

They must not print the cloudflared command line, tunnel token, MCP token, or raw connector log.

## Local secret handling

The operator must never paste the new tunnel token into ChatGPT, MCP, documentation, screenshots, Git, or shared logs.

The token is entered only into the hidden local prompt produced by:

```bash
npm run route:a:start
```

The command prompts locally for:

1. `MCP_HTTP_TOKEN`
2. the new `CLOUDFLARE_TUNNEL_TOKEN`

Only the raw token value should be pasted into each prompt. Do not paste the full Cloudflare installer command into the token prompt.

## Controlled verification flow

### Terminal A

```bash
cd ~/projects/mobile-job-radar-agent
git pull --ff-only
git log -1 --oneline
bash -n scripts/status-route-a.sh scripts/stop-route-a.sh scripts/start-route-a.sh
npm run route:a:start
```

Keep Terminal A open. `route:a:start` runs cloudflared in the foreground and stops the API/MCP runtime when Terminal A is interrupted.

Expected connector evidence includes registered tunnel connections without printing token values.

### Terminal B

After Terminal A shows successful tunnel connection:

```bash
cd ~/projects/mobile-job-radar-agent
npm run route:a:status
curl -sS -o /dev/null -D - https://s22login.aidesk.rest/ | sed -n '1,12p'
git status --short
```

Expected:

```text
API running
MCP HTTP running with bearer authentication enabled
cloudflared running
cloudflared command line suppressed
public no-token MCP request -> 401 Unauthorized
login hostname -> Cloudflare Access redirect/challenge
working tree clean
```

The operator should also check the Cloudflare dashboard and confirm:

```text
Active replicas: at least 1
Status: Healthy
Routes: 2
```

## Stop after proof

Return to Terminal A and press `Ctrl+C`.

The Route A cleanup should stop:

- cloudflared
- MCP HTTP
- local API

Then in Terminal B:

```bash
npm run route:a:status
git status --short
```

Expected idle state:

```text
cloudflared is not running
MCP HTTP stopped
API stopped
working tree clean
```

## Important boundaries

- Keep noVNC and VNC off during Phase 7Q-C1.
- Do not test the user login page yet.
- Do not publish ports 3001, 3002, or 5901.
- The rotated shared tunnel token is used by both MCP and login hostnames.
- Do not stop the shared tunnel during a future active authenticated task; the correct login kill switch is to stop noVNC and VNC while keeping MCP connectivity available.

## Acceptance decision

Do not mark Phase 7Q-C1 fully PASS until:

- S22 starts the shared connector with the new token
- dashboard shows a healthy active replica
- `s22agent.aidesk.rest/mcp` returns 401 without an MCP bearer token
- `s22login.aidesk.rest` presents Cloudflare Access
- status output suppresses the cloudflared command line
- Route A shuts down cleanly after the proof
- no token or credential is printed
- Git working tree remains clean
