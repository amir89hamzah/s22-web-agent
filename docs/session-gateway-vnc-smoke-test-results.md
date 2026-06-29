# Phase 7C-1 — Local VNC + Visible Chromium Smoke Test Results

Status: PASS  
Date: 2026-06-29  
Phase: User-Controlled Session Gateway / Option B foundation

## Scope

This test validates the local-only GUI foundation for Option B — Playwright Manual Login via VNC / Session Capture Mode.

This test does not implement session capture yet. It only proves that Debian proot can show a visible browser through local VNC on the S22.

## Environment

- Host: Samsung S22 running Termux.
- Debian proot: Debian GNU/Linux 13 (trixie).
- Architecture: aarch64.
- Node inside Debian: v20.19.2.
- npm inside Debian: 9.2.0.
- Chromium inside Debian: 149.0.7827.114.
- Playwright version checked through npx: 1.61.1.
- VNC server: TigerVNC.
- Desktop/window manager: Openbox.
- Terminal: xterm.
- Android VNC client tested: AVNC.
- VNC display: `:1`.
- Local VNC port: `5901`.
- Access mode: local-only `127.0.0.1:5901`.

## Test steps completed

1. Confirmed Debian proot, Chromium, Node, npm, and Playwright availability.
2. Confirmed VNC and desktop packages were initially missing.
3. Installed minimal VNC/GUI stack in Debian:
   - `tigervnc-standalone-server`
   - `tigervnc-common`
   - `openbox`
   - `xterm`
   - `dbus-x11`
   - `fonts-liberation`
4. Created `/root/.vnc/xstartup`.
5. Set VNC password locally with `vncpasswd`.
6. Started TigerVNC local-only on display `:1`.
7. Connected from AVNC on the S22 to `127.0.0.1:5901`.
8. Confirmed Openbox desktop and `xterm` window were visible.
9. Launched Chromium on `DISPLAY=:1`.
10. Confirmed Chromium opened `https://example.com` visibly inside AVNC.
11. Stopped VNC and cleaned stale VNC/Chromium test artifacts.

## Result

PASS.

The S22 can run a temporary local VNC desktop in Debian proot and show Chromium through AVNC. This confirms the GUI foundation needed for future Session Capture Mode.

Verified visual chain:

```text
AVNC on S22
  -> 127.0.0.1:5901
  -> TigerVNC display :1 in Debian proot
  -> Openbox desktop
  -> visible Chromium
  -> https://example.com
```

## Security observations

- Raw VNC was not exposed publicly.
- VNC was bound for local access only.
- No password, cookie, token, or storageState value was sent to ChatGPT.
- No website login was performed during this smoke test.
- No session files were committed to git.
- VNC and Chromium were stopped after the test.

## Cleanup confirmed

After cleanup:

- `vncserver -list` showed no active sessions.
- No related `Xtigervnc`, `chromium`, `openbox`, or `xterm` process remained.
- `/tmp/s22-vnc-chromium-test` was removed.

## Next step

Add and use helper scripts for local-only VNC lifecycle:

```bash
npm run session:vnc:start
npm run session:vnc:status
npm run session:vnc:stop
```

After this baseline is committed, the next practical phase is Session Capture Mode:

1. Start local-only VNC.
2. Launch visible Playwright/Chromium.
3. User logs in manually.
4. Save `.runtime/sessions/<profile>/storageState.json`.
5. Stop VNC.
6. Reuse the named profile in future headless scans.
