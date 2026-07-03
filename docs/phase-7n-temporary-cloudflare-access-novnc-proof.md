# Phase 7N — Temporary Cloudflare Access Protected noVNC Proof

## Status

Planned / operator-guided proof prepared.

No public tunnel or public noVNC route is started by the Phase 7N guide scripts.

## Goal

Prove that a temporary public HTTPS route can let the operator control the existing S22 manual-login browser through noVNC, while keeping raw VNC, API, Playwright worker, and session files local-only.

Target route for the first proof:

```text
remote browser
  -> Cloudflare protected hostname
  -> cloudflared tunnel on S22
  -> local noVNC 127.0.0.1:6080
  -> local VNC 127.0.0.1:5901
  -> Debian Chromium login page
  -> human-controlled login
  -> local storageState capture
```

## Option chosen for Phase 7N

Use Option A first:

```text
Cloudflare Access protected hostname
  -> http://127.0.0.1:6080
  -> noVNC/websockify
  -> 127.0.0.1:5901 VNC
```

Option B, a custom token-checking gateway in front of noVNC, is deferred until after this temporary route proof. Option B remains useful later for a stronger agent-controlled lifecycle, but it is not required for the first public noVNC proof.

## Route separation

Do not modify the existing MCP route:

```text
s22agent.aidesk.rest -> http://127.0.0.1:3003
```

Use a separate temporary login hostname, for example:

```text
s22login.aidesk.rest -> http://127.0.0.1:6080
```

## Security boundary

The following must remain true:

- raw VNC `5901` is not exposed publicly
- API `3001` is not exposed publicly
- Playwright worker `3002` is not exposed publicly
- storageState remains local under `.runtime/sessions/<profile>/`
- no passwords, cookies, tokens, MFA codes, or storageState JSON are printed
- manual login remains human-controlled
- the public noVNC route is temporary
- the public noVNC route is stopped or disabled after proof

## Cloudflare Access meaning

Cloudflare Access is a guard in front of the public noVNC hostname.

It is different from the noVNC/VNC password.

Expected layers:

```text
Layer 1: Cloudflare Access verification for s22login.aidesk.rest
Layer 2: noVNC/VNC password
Layer 3: target website login inside Debian Chromium
```

For the first proof, use only the local demo login. Do not use a real external account until the temporary public route lifecycle has been proven.

## Added guide scripts

```bash
npm run session:novnc:public-temp:start-guide -- <public-host>
npm run session:novnc:public-temp:status -- <public-host>
npm run session:novnc:public-temp:stop-guide -- <public-host>
```

The scripts are operator guides only:

- they do not create Cloudflare routes
- they do not start Cloudflare tunnels
- they do not store Cloudflare tokens
- they do not print secrets

## Candidate URLs

Local noVNC URL from PC through SSH local forward:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

Candidate public HTTPS noVNC URL:

```text
https://s22login.aidesk.rest/vnc.html?host=s22login.aidesk.rest&port=443
```

Public noVNC must use the public hostname in the noVNC URL. Do not use `host=127.0.0.1` in the remote/public browser URL, because `127.0.0.1` would refer to the user's computer, not the S22.

## Operator flow for proof

1. Pull latest repo on S22.
2. Confirm no public route is active yet.
3. Start local demo login flow using the Phase 7M wrapper.
4. Verify local noVNC works first.
5. Add a separate Cloudflare route for the temporary login hostname.
6. Confirm Cloudflare Access protection if available.
7. Open the public HTTPS noVNC URL.
8. Connect noVNC and login to the local demo page.
9. Complete the manual login job.
10. Confirm headless profile scan finds `S22 DEMO AUTH PASS` with text excerpt suppression.
11. Run kill switch guide and stop local services.
12. Remove or disable the Cloudflare temporary route.
13. Confirm no public noVNC URL remains usable.

## Example commands after Cloudflare route is prepared

Start local proof flow:

```bash
npm run session:demo:start
SESSION_LOGIN_TIMEOUT_MS=900000 npm run session:manual-login:novnc:start -- novnc-public-demo http://127.0.0.1:3107/login
```

Print Phase 7N route guide:

```bash
npm run session:novnc:public-temp:start-guide -- s22login.aidesk.rest
```

Complete after manual login succeeds:

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:manual-login:novnc:complete -- novnc-public-demo http://127.0.0.1:3107/secure "S22 DEMO AUTH PASS"
```

Stop local services:

```bash
npm run session:novnc:public-temp:stop-guide -- s22login.aidesk.rest
```

## Kill switch

If anything looks wrong, immediately run:

```bash
npm run session:novnc:public-temp:stop-guide -- s22login.aidesk.rest
```

Then remove or disable this Cloudflare route in the dashboard:

```text
s22login.aidesk.rest -> http://127.0.0.1:6080
```

Do not remove the MCP route unless intentionally stopping MCP:

```text
s22agent.aidesk.rest -> http://127.0.0.1:3003
```

## Acceptance criteria

Phase 7N is PASS only when:

- Cloudflare route uses a separate login hostname
- existing MCP route remains unchanged
- public route points only to local noVNC `127.0.0.1:6080`
- raw VNC `5901` remains local-only
- API `3001` and Playwright worker `3002` remain private
- remote browser can open protected noVNC route
- local demo login succeeds through public noVNC
- `novnc-public-demo` profile is saved locally
- profile scan finds `S22 DEMO AUTH PASS`
- `SESSION_SCAN_SUPPRESS_EXCERPT=1` suppresses page text excerpt
- no secret values are printed
- local services are stopped after proof
- temporary Cloudflare route is removed or disabled after proof

## Phase 7N decision

Phase 7N should start with demo login only.

Do not use real external login credentials until this temporary public noVNC route has been proven and stopped cleanly.
