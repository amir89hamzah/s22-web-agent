# Phase 7K — Local noVNC Gateway Proof

## Status

PASS — local-only noVNC gateway proof completed.

## Goal

Prove the noVNC gateway locally before any Cloudflare or public exposure.

The target route is:

```text
Browser on S22 or PC via SSH local forward
  -> local noVNC web page on 127.0.0.1:6080
  -> websockify/noVNC
  -> local-only VNC on 127.0.0.1:5901
  -> Debian proot browser session
```

## Safety boundary

- Raw VNC `5901` must not be exposed publicly.
- API `3001` must not be exposed publicly.
- Playwright worker `3002` must not be exposed publicly.
- Cloudflare/public tunnel is not used in this phase.
- Manual login remains human-controlled.
- Passwords, cookies, tokens, and storageState content must not be printed.
- storageState remains local under `.runtime/sessions/<profile>/`.
- Authenticated scan proof should use `SESSION_SCAN_SUPPRESS_EXCERPT=1`.

## Added local helper scripts

```bash
npm run session:novnc:start:local
npm run session:novnc:status:local
npm run session:novnc:stop:local
```

The local noVNC helper binds to:

```text
127.0.0.1:6080
```

and forwards only to:

```text
127.0.0.1:5901
```

## Local browser URL

On S22:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

From Windows PC, use SSH local forwarding first:

```powershell
ssh -N -L 6080:127.0.0.1:6080 -p 8022 amir.sarihan@10.20.71.98
```

Then open the same local URL on the PC browser:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

## Result

Phase 7K local-only noVNC gateway proof passed.

Evidence:

- Stable VNC was running through `npm run session:vnc:start:stable`.
- noVNC and websockify were installed inside Debian proot.
- noVNC helper scripts were added:
  - `npm run session:novnc:start:local`
  - `npm run session:novnc:status:local`
  - `npm run session:novnc:stop:local`
- noVNC was started through local helper script.
- noVNC listened on `127.0.0.1:6080`.
- noVNC proxied to local VNC `127.0.0.1:5901`.
- S22 browser could open the local noVNC page.
- Windows browser could open noVNC through SSH local forwarding.
- PowerShell SSH local forward stayed open after password entry.
- Live PC control was confirmed using `echo PHASE7K-PC-PASS` inside the noVNC terminal.
- Raw VNC `5901` was not exposed publicly.
- API `3001` and Playwright worker `3002` were not exposed.
- Cloudflare/public tunnel was not used.
- No password/cookie/token/storageState values were printed.

Windows SSH local forwarding command used:

```powershell
ssh -N -L 6080:127.0.0.1:6080 -p 8022 amir.sarihan@10.20.71.98
```

Windows browser URL used:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

## Phase 7K decision

Authenticated GitHub login was not repeated in this phase because Phase 7K only proves the local noVNC gateway path. Authenticated manual login had already been proven in Phase 7H and Phase 7I.

Next suitable phase:

```text
Phase 7L — noVNC-assisted manual login job integration
```

## Stop commands

```bash
npm run session:novnc:stop:local
npm run session:vnc:stop:stable
```
