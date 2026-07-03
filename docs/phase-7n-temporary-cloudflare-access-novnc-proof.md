# Phase 7N — Temporary Cloudflare Access Protected noVNC Proof

## Status

PASS — temporary Cloudflare Access protected public noVNC proof completed.

Final smooth retest completed on 2026-07-03 after S22 reboot and tmux tunnel helper hardening.

No passwords, cookies, MFA codes, Cloudflare tokens, or storageState JSON were printed in the final proof output.

## Goal

Prove that a temporary public HTTPS route can let the operator control the existing S22 manual-login browser through noVNC, while keeping raw VNC, API, Playwright worker, and session files local-only.

Validated route:

```text
remote browser
  -> Cloudflare Access protected hostname
  -> cloudflared tunnel connector on S22
  -> local noVNC 127.0.0.1:6080
  -> local VNC 127.0.0.1:5901
  -> Debian Chromium login page
  -> human-controlled login
  -> local storageState capture
  -> local headless profile reuse scan
```

## Option chosen for Phase 7N

Option A was validated first:

```text
Cloudflare Access protected hostname
  -> http://127.0.0.1:6080
  -> noVNC/websockify
  -> 127.0.0.1:5901 VNC
```

Option B, a custom token-checking gateway in front of noVNC, remains deferred. Option B may still be useful later for a stronger agent-controlled lifecycle, but it is not required for the first public noVNC proof.

## Route separation

Existing MCP route remained separate:

```text
s22agent.aidesk.rest -> http://127.0.0.1:3003
```

Temporary login hostname used for Phase 7N:

```text
s22login.aidesk.rest -> http://127.0.0.1:6080
```

## Security boundary

The following remained true during the successful proof:

- raw VNC `5901` was not exposed publicly
- API `3001` was not exposed publicly
- Playwright worker `3002` was not exposed publicly
- storageState remained local under `.runtime/sessions/<profile>/`
- no passwords, cookies, tokens, MFA codes, or storageState JSON were printed
- manual login remained human-controlled
- public noVNC route used a separate hostname
- public noVNC route was protected by Cloudflare Access
- noVNC/VNC/demo/tunnel runtime services were stopped after proof

## Cloudflare Access meaning

Cloudflare Access is a guard in front of the public noVNC hostname.

It is different from the noVNC/VNC password.

Validated layers:

```text
Layer 1: Cloudflare Access verification for s22login.aidesk.rest
Layer 2: noVNC/VNC password
Layer 3: target website login inside Debian Chromium
```

For Phase 7N, only the local demo login was used. No real external account login was used.

## Added and hardened scripts

Guide scripts:

```bash
npm run session:novnc:public-temp:start-guide -- <public-host>
npm run session:novnc:public-temp:status -- <public-host>
npm run session:novnc:public-temp:stop-guide -- <public-host>
```

Cloudflare connector tmux helpers:

```bash
npm run session:novnc:public-temp:tunnel:start
npm run session:novnc:public-temp:tunnel:status
npm run session:novnc:public-temp:tunnel:stop
```

Hardening added during Phase 7N:

- Cloudflare connector can run in a dedicated tmux session instead of SSH foreground.
- Tunnel status helper avoids printing raw cloudflared logs.
- Tunnel start helper removes `CLOUDFLARE_TUNNEL_TOKEN` from the environment before cloudflared starts.
- Stop guide preserves completed login state instead of overwriting it with cancelled status after a successful proof.

## Candidate URLs

Local noVNC URL from PC through SSH local forward:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

Public HTTPS noVNC URL used for Phase 7N:

```text
https://s22login.aidesk.rest/vnc.html?host=s22login.aidesk.rest&port=443
```

Public noVNC must use the public hostname in the noVNC URL. Do not use `host=127.0.0.1` in the remote/public browser URL, because `127.0.0.1` would refer to the user's computer, not the S22.

## Successful proof flow

Final smooth flow:

1. Rebooted S22 to clear stale runtime state.
2. Confirmed repo was up to date and clean.
3. Confirmed VNC/noVNC/cloudflared were not running.
4. Started Cloudflare connector with tmux helper.
5. Confirmed safe tunnel status summary:
   - registered tunnel connection: yes
   - configuration update received: yes
   - cloudflared precheck: healthy
   - cloudflared process: running
6. Started local demo server on `127.0.0.1:3107`.
7. Started local noVNC-assisted manual login flow with profile `novnc-public-demo`.
8. Opened public noVNC through Cloudflare Access.
9. Logged in to local demo page manually.
10. Reached `S22 DEMO AUTH PASS` through public noVNC.
11. Completed manual login job.
12. storageState saved locally under `.runtime/sessions/<profile>/`.
13. Authenticated profile scan ran with `SESSION_SCAN_SUPPRESS_EXCERPT=1`.
14. Expected text `S22 DEMO AUTH PASS` was found.
15. Stopped noVNC/VNC/demo/tunnel runtime services.
16. Final S22-side status showed no local VNC/noVNC services running and cloudflared stopped.

## Successful proof output summary

Completion state:

```text
status: completed
profile: novnc-public-demo
title: S22 Demo Secure Area
finalUrl: http://127.0.0.1:3107/secure
storageStatePath: .runtime/sessions/<profile>/storageState.json
metadataPath: .runtime/sessions/<profile>/metadata.json
```

Profile scan:

```text
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

Cleanup:

```text
PASS: stopped local noVNC tmux session: s22-novnc-local
PASS: stopped tmux session: s22-cloudflared-public-temp
VNC sessions: none
local noVNC: not running
```

## Known notes from trial-and-error

- If S22 runtime gets mixed or stale ports appear, rebooting S22 gives the cleanest baseline.
- `Error 1033` means the Cloudflare route exists but the tunnel connector is not active or reachable.
- `address already in use` on `3107` means demo server is already running.
- `address already in use` on `6080` means noVNC/websockify is already running or stale.
- The `--shm-helper` Chromium warning appeared but did not block the successful proof.
- Android/Samsung may terminate Termux under heavy combined load; tmux helpers reduce SSH foreground fragility but cannot prevent Android from killing the whole app.
- Earlier trial output exposed the Cloudflare tunnel token via raw cloudflared logs. The helper was hardened afterward. Rotate or recreate the Cloudflare tunnel token before any future public test.

## Kill switch

If anything looks wrong, immediately run:

```bash
npm run session:novnc:public-temp:stop-guide -- s22login.aidesk.rest
npm run session:novnc:public-temp:tunnel:stop
```

If an old foreground cloudflared process is suspected:

```bash
FORCE_STOP_CLOUDFLARED=1 npm run session:novnc:public-temp:tunnel:stop
```

Then remove or disable this Cloudflare route in the dashboard if pausing public tests:

```text
s22login.aidesk.rest -> http://127.0.0.1:6080
```

Do not remove the MCP route unless intentionally stopping MCP:

```text
s22agent.aidesk.rest -> http://127.0.0.1:3003
```

## Acceptance criteria

Phase 7N PASS criteria:

- [x] Cloudflare route uses a separate login hostname
- [x] existing MCP route remains unchanged
- [x] public route points only to local noVNC `127.0.0.1:6080`
- [x] raw VNC `5901` remains local-only
- [x] API `3001` and Playwright worker `3002` remain private
- [x] Cloudflare Access protects the public noVNC hostname
- [x] remote browser can open protected noVNC route
- [x] local demo login succeeds through public noVNC
- [x] `novnc-public-demo` profile is saved locally
- [x] profile scan finds `S22 DEMO AUTH PASS`
- [x] `SESSION_SCAN_SUPPRESS_EXCERPT=1` suppresses page text excerpt
- [x] no secret values are printed in final proof output
- [x] local services are stopped after proof
- [x] temporary tunnel connector is stopped after proof

## Phase 7N decision

Phase 7N is complete for the local demo account.

Do not use real external login credentials until token rotation is complete and the temporary public route lifecycle is intentionally re-opened.

Recommended next phase: Phase 7O — full agent continuity after safety gates, using saved local profile reuse instead of repeating manual login every time.
