# Phase 7Q-C0 — Cloudflare Security Preflight

## Status

Implemented in the repository for the actual shared-tunnel architecture.

Cloudflare dashboard confirmation completed on 11 July 2026 for:

- separate MCP and login hostnames
- `s22login.aidesk.rest` self-hosted Access application
- `Allow` policy restricted with `Include -> Emails -> exact operator email`
- 30-minute application session duration
- browser-rendering VNC feature left disabled because the project uses the noVNC web application

Live S22 preflight and controlled shared-tunnel token rotation are still pending.

Phase 7Q-C0 is a safety gate before Phase 7Q-C may expose temporary noVNC through Cloudflare.

It does not start VNC, noVNC, cloudflared, a tunnel, or a public route.

## Why this phase exists

The final authenticated-task flow will eventually be:

```text
ChatGPT prepares authenticated task
  -> saved profile is expired or missing
  -> state: login_required
  -> user explicitly approves a temporary login gateway
  -> protected Cloudflare hostname becomes reachable
  -> user logs in through noVNC
  -> profile is captured and verified
  -> VNC and noVNC stop
  -> shared Cloudflare tunnel remains available for MCP
  -> original task resumes
```

Before building that flow, the project must prove:

- the historical shared-tunnel token is no longer trusted
- the login hostname is separate from the MCP hostname
- Cloudflare Access protects the login hostname
- the Access policy is restricted to the operator's exact email/account
- the existing shared connector may remain running for MCP
- no second legacy public-temp connector is running
- noVNC and VNC remain stopped while the login gateway is idle
- no token value is printed or passed through ChatGPT/MCP

## Actual shared-tunnel architecture

Both published applications use the existing remotely managed tunnel:

```text
Tunnel:
  s22-web-agent-mcp

MCP hostname:
  s22agent.aidesk.rest -> 127.0.0.1:3003

Temporary login hostname:
  s22login.aidesk.rest -> 127.0.0.1:6080
```

The hostnames and services remain separate even though they share one connector.

Ports `3001`, `3002`, and raw VNC `5901` must never be published.

Because the tunnel is shared, stopping cloudflared after login would also disconnect MCP. The correct idle-state kill switch is therefore:

```text
stop noVNC
stop VNC
close the manual-login browser job
keep the shared connector available for MCP when needed
```

A separate dedicated login tunnel may be considered later as optional hardening, but it is not required for the current proof.

## Confirmed Cloudflare Access configuration

Dashboard evidence confirmed:

```text
Application:
  S22 noVNC temporary login

Destination:
  s22login.aidesk.rest

Policy:
  Allow Amir only

Action:
  Allow

Include rule:
  Emails -> exact operator email

Application session duration:
  30 minutes
```

The following broad alternatives are not used:

- `Everyone`
- an entire public email domain
- all valid one-time-pin users without an exact-email restriction

Browser rendering remains disabled because Cloudflare is protecting a normal web application (`noVNC`), not providing its own RDP/SSH/VNC browser-rendering session.

## Shared tunnel token rotation

The historical connector token appeared in early raw logs and must be replaced before the Phase 7Q-C public login proof.

Because the connector is shared by MCP and login routes, rotation must be performed as a controlled maintenance step:

1. stop the old connector at an agreed point
2. regenerate or rotate the token for `s22-web-agent-mcp`
3. enter the new token only in the local S22 shell
4. start the connector with the new token
5. verify both published routes
6. never paste or display the token in ChatGPT, MCP, docs, screenshots, Git, or shared logs

Do not rotate the token while an important MCP task is in progress.

## Automated preflight command

Default mode matches the current shared tunnel:

```bash
npm run auth:gateway:cloudflare:preflight -- s22login.aidesk.rest
```

Equivalent explicit form:

```bash
AUTH_GATEWAY_TUNNEL_MODE=shared \
  npm run auth:gateway:cloudflare:preflight -- s22login.aidesk.rest
```

The helper checks:

- `curl`, `tmux`, and `cloudflared` exist
- the legacy public-temp tunnel tmux session is not running
- a running cloudflared process is allowed in shared mode
- the cloudflared command line and token are not displayed
- `CLOUDFLARE_TUNNEL_TOKEN` is not exported in the current shell
- no temporary token file remains under `.runtime/`
- local noVNC is not reachable on `127.0.0.1:6080`
- no VNC process is detected while idle
- the public hostname presents a Cloudflare Access login challenge
- the login hostname is not the MCP hostname

The helper does not display response headers, redirect URLs, cloudflared command lines, or token values.

## Result states

### `shared_tunnel_local_safe_and_access_front_door_detected`

Automated local safety checks passed and an Access login challenge was detected from the public hostname.

A shared cloudflared connector may be either running or stopped. Its presence is not a failure in shared mode.

This result does not prove that the historical tunnel token was rotated. Token replacement remains a separate operator-controlled maintenance action.

Exit code: `0`

### `operator_action_required`

Examples:

- Access redirect was not detected
- hostname or Access application is not configured
- token remains exported in the current shell
- local noVNC or VNC is still running while idle
- dedicated mode was requested while a connector is running

Exit code: `21`

### `unsafe_or_incomplete`

Examples:

- the legacy second public-temp tunnel tmux session is running
- public content returns HTTP 200 without an Access challenge
- a temporary token file remains
- a required command is missing
- login and MCP hostnames are the same
- tunnel mode is invalid

Exit code: `23`

## Expected S22 verification

Run only after pulling the shared-mode correction:

```bash
cd ~/projects/mobile-job-radar-agent

git pull --ff-only

git log -1 --oneline

bash -n scripts/auth-gateway-cloudflare-preflight.sh

AUTH_GATEWAY_TUNNEL_MODE=shared \
  npm run auth:gateway:cloudflare:preflight -- s22login.aidesk.rest

git status --short
```

Expected safe outcome when the shared connector is already running:

```text
PASS: curl found
PASS: tmux found
PASS: cloudflared found
PASS: no legacy public-temp tunnel tmux session is running
PASS: a cloudflared connector is running and is allowed in shared mode
PASS: CLOUDFLARE_TUNNEL_TOKEN is not exported in this shell
PASS: no temporary tunnel token file remains
PASS: local noVNC is not reachable
PASS: no VNC process detected
PASS: Cloudflare Access login challenge detected
PREFLIGHT RESULT: shared_tunnel_local_safe_and_access_front_door_detected
```

If the shared connector is stopped, the helper may print an informational message instead of the connector-running PASS. This is acceptable if all other checks pass.

The final `git status --short` should produce no output.

## Acceptance decision

Do not begin Phase 7Q-C public gateway orchestration until all of the following are confirmed:

- exact login hostname route confirmed
- exact-email Access Allow policy confirmed
- no broad Access policy remains
- shared-tunnel-aware preflight exit code is `0`
- VNC and noVNC remain stopped after preflight
- no legacy second connector is running
- historical shared-tunnel token is replaced in a controlled maintenance step
- no secret value is printed
- Git working tree remains clean