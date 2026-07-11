# Phase 7Q-C2 — Approval-Gated Shared-Tunnel Login Gateway

## Status

Implemented in the repository. Static S22 verification and the live protected GitHub dummy-account login proof are pending.

Phase 7Q-C1 already proved:

- the historical shared-tunnel token was rotated
- the new token was accepted by the S22 connector
- the Cloudflare dashboard showed one healthy `android_arm64` replica
- public MCP returned `401 Unauthorized` without its bearer token
- `s22login.aidesk.rest` returned the Cloudflare Access challenge
- Route A shut down cleanly

## Objective

Complete the human-in-the-loop path:

```text
ChatGPT prepares authenticated task
  -> profile missing or expired
  -> state: login_required
  -> user explicitly approves
  -> existing shared Cloudflare connector remains running
  -> S22 starts local VNC + local noVNC + manual-login browser
  -> protected URL is returned
  -> user passes Cloudflare Access and logs in manually
  -> user confirms login completion
  -> profile is saved locally
  -> noVNC and VNC stop
  -> authenticated task is re-probed
  -> state: ready
  -> shared MCP tunnel remains running
```

## Network decision

MCP may continue to bind to `0.0.0.0` for trusted LAN and future field-agent expansion, including future network-analysis tools such as Wireshark.

This changes only who can reach the MCP listener. It does not define what tools the agent can execute.

Safety rule:

```text
non-loopback MCP bind -> MCP_HTTP_TOKEN is mandatory
loopback-only MCP bind -> token may be omitted for controlled local tests
```

Both `scripts/start-mcp-http.sh` and `src/mcp-http-server.mjs` now reject a non-loopback startup when the bearer token is empty.

## Commands

```bash
npm run auth:login-gateway:start -- <job> approved
npm run auth:login-gateway:status -- <job>
npm run auth:login-gateway:complete -- <job> confirmed
npm run auth:login-gateway:cancel -- <job>
```

The literal words `approved` and `confirmed` represent explicit user decisions. They must not be supplied speculatively by the assistant.

## MCP tools

```text
browser_authenticated_login_gateway_start
browser_authenticated_login_gateway_status
browser_authenticated_login_gateway_complete
browser_authenticated_login_gateway_cancel
```

The MCP start tool requires:

```json
{
  "job": "safe-job-name",
  "approved": true
}
```

The complete tool requires:

```json
{
  "job": "safe-job-name",
  "userConfirmedLoginComplete": true
}
```

The tools accept no password, cookie, session token, MFA code, storageState path/content, MCP token, Cloudflare token, or full user prompt.

## Start safety gates

The gateway start is blocked unless all of the following are true:

- the authenticated task exists
- task state is `login_required`
- `approvalRequired` is `true`
- a login URL exists in task metadata
- the user approval literal is present
- the shared `cloudflared` connector is already running
- the public login hostname presents a Cloudflare Access challenge
- local VNC/noVNC startup succeeds
- local noVNC becomes reachable on `127.0.0.1:6080`

The helper never starts the shared Cloudflare connector and never accepts its token.

## Runtime state

After successful start:

```text
state: waiting_for_user_login
approvalRecorded: true
publicGatewayStarted: true
sharedTunnelStartedByThisHelper: false
```

The protected URL is based on:

```text
https://s22login.aidesk.rest/vnc.html
```

It contains only noVNC connection parameters and no credential.

## Completion behavior

After the user confirms that website login succeeded:

1. the manual-login worker saves Playwright storageState locally
2. local noVNC stops
3. stable VNC stops
4. the authenticated task runs its live profile probe
5. valid profile -> `ready`
6. invalid profile -> `login_required`
7. shared Cloudflare connector remains running for MCP continuity

If completion is requested too early and the profile is not saved, the gateway is not deliberately marked completed. The operator can inspect status or cancel safely.

## Cancellation behavior

Gateway cancel:

- cancels the manual-login worker
- stops noVNC
- stops VNC
- marks the authenticated task `cancelled`
- leaves the shared Cloudflare connector running

The generic authenticated-task cancel action refuses to act while a login gateway is active, preventing VNC/noVNC from being orphaned.

## Static S22 verification

Run with Route A stopped:

```bash
cd ~/projects/mobile-job-radar-agent

git pull --ff-only

git log -1 --oneline

node --check tools/auth-login-gateway-orchestrator.mjs
node --check src/mcp-auth-login-gateway-tools.mjs
node --check tools/authenticated-task-orchestrator.mjs
node --check src/mcp-server.mjs
node --check src/mcp-http-server.mjs

bash -n \
  scripts/start-mcp-http.sh \
  scripts/auth-login-gateway-start.sh \
  scripts/auth-login-gateway-status.sh \
  scripts/auth-login-gateway-complete.sh \
  scripts/auth-login-gateway-cancel.sh

MCP_HTTP_HOST=0.0.0.0 MCP_HTTP_TOKEN= npm run mcp:http:start || true

npm run mcp:http:status

git status --short
```

Expected auth-guard proof:

```text
FAIL: MCP_HTTP_TOKEN is required when MCP_HTTP_HOST is not loopback.
Process: no PID file
Health: not reachable
```

No service should remain running.

## Live Phase 7Q-C2 proof

Use a new profile name so the initial task definitely reaches `login_required`:

```text
job: github-public-login-proof
profile: github-gateway-proof
```

### Terminal A — shared protected Route A

```bash
cd ~/projects/mobile-job-radar-agent
npm run route:a:start
```

Enter the MCP bearer token and rotated Cloudflare tunnel token only at the hidden local prompts. Keep Terminal A open.

### Terminal B — prepare missing profile

```bash
cd ~/projects/mobile-job-radar-agent

npm run auth:task:prepare -- \
  github-public-login-proof \
  github-gateway-proof \
  https://github.com/settings/profile \
  "Public profile" \
  https://github.com/login
```

Expected:

```text
state: login_required
approvalRequired: true
publicGatewayStarted: false
```

### Explicit operator approval and gateway start

Only after the operator agrees to open the temporary protected gateway:

```bash
npm run auth:login-gateway:start -- \
  github-public-login-proof \
  approved
```

Expected:

```text
state: waiting_for_user_login
approvalRecorded: true
publicGatewayStarted: true
runtime.sharedConnectorRunning: true
runtime.noVncReachable: true
runtime.vncRunning: true
```

Open only the returned `gatewayUrl`. Pass Cloudflare Access using the exact allowlisted email, connect noVNC, and log in to the owned GitHub dummy account. Do not send credentials to ChatGPT or Termux output.

### Complete after human login

After the user confirms GitHub login is visibly complete:

```bash
npm run auth:login-gateway:complete -- \
  github-public-login-proof \
  confirmed
```

Expected:

```text
state: ready
publicGatewayStarted: false
runtime.noVncReachable: false
runtime.vncRunning: false
```

Then verify:

```bash
npm run auth:task:status -- github-public-login-proof
npm run route:a:status
git status --short
```

Expected:

- task is `ready`
- shared MCP Route A is still running
- noVNC and VNC are stopped
- no token or credential is printed
- working tree is clean

Finally return to Terminal A and press `Ctrl+C` for the end-of-proof Route A cleanup.

## Acceptance decision

Do not mark Phase 7Q-C2 fully PASS until:

- static syntax checks pass
- non-loopback-without-token startup is rejected
- four new MCP tools appear in `tools/list`
- a missing profile returns `login_required`
- explicit approval starts the protected VNC/noVNC path
- the user reaches GitHub through Cloudflare Access and noVNC
- completion saves a valid profile
- authenticated task reaches `ready`
- noVNC and VNC stop after completion
- shared MCP connector remains available until the proof ends
- final Route A cleanup succeeds
- no secret value is printed
- Git working tree remains clean
