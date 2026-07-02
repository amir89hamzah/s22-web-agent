# Phase 7M — Local noVNC-assisted Manual Login Job Integration

## Status

PASS — local noVNC-assisted manual login job integration completed and retested after hardening.

This phase kept the manual login flow local-only and did not start any Cloudflare or public tunnel.

## Purpose

Phase 7M connects three pieces that were previously run separately:

```text
stable local VNC
  + local noVNC gateway
  + pending manual login job
```

The operator can start one local noVNC-assisted login flow, complete login manually from a PC browser through SSH local forwarding, save a reusable session profile, then optionally run an authenticated profile scan with page text excerpt suppression.

## Safety boundary

Phase 7M kept these services local-only:

```text
127.0.0.1:5901  raw VNC
127.0.0.1:6080  local noVNC gateway
```

Phase 7M did not expose:

```text
3001  API server
3002  Playwright worker
5901  raw VNC
6080  local noVNC gateway
```

No public Cloudflare tunnel was started by any Phase 7M wrapper.

The wrapper must never print:

- passwords
- cookies
- session tokens
- MFA codes
- bearer tokens
- storageState JSON

The captured profile remains local under:

```text
.runtime/sessions/<profile>/
```

## Added npm scripts

```bash
npm run session:manual-login:novnc:start -- <profile> <url>
npm run session:manual-login:novnc:status -- <profile>
npm run session:manual-login:novnc:complete -- <profile> [scan-url] [expected-text]
npm run session:manual-login:novnc:cancel -- <profile>
```

These scripts call the wrappers:

```text
scripts/session-manual-login-novnc-local-start.sh
scripts/session-manual-login-novnc-local-status.sh
scripts/session-manual-login-novnc-local-complete.sh
scripts/session-manual-login-novnc-local-cancel.sh
```

## Start flow

Example using the local demo login server:

```bash
npm run session:demo:start
SESSION_LOGIN_TIMEOUT_MS=900000 npm run session:manual-login:novnc:start -- novnc-local-demo http://127.0.0.1:3107/login
```

The start wrapper does this:

```text
1. Validates profile name.
2. Validates login URL.
3. Cleans up stale previous manual-login state for the profile when safe to do so.
4. Starts stable local VNC through tmux.
5. Starts local noVNC on 127.0.0.1:6080.
6. Starts the pending manual login job.
7. Prints local browser and SSH-forward instructions.
8. Prints no secrets.
```

## PC browser access

From Windows PowerShell, create a local SSH forward to the S22:

```powershell
ssh -N -L 6080:127.0.0.1:6080 -p 8022 <termux-user>@<s22-ip>
```

Then open this in the Windows browser:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

The route remains local:

```text
Windows browser
  -> Windows 127.0.0.1:6080
  -> SSH local forward
  -> S22 127.0.0.1:6080 noVNC
  -> S22/Debian 127.0.0.1:5901 VNC
  -> Debian desktop and Chromium
```

## Complete flow

After login succeeds in the visible noVNC browser, complete the job:

```bash
npm run session:manual-login:novnc:complete -- novnc-local-demo
```

This signals the manual login worker, waits for it to save the local profile, then stops local noVNC by default.

To complete and immediately run a suppressed authenticated scan:

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:manual-login:novnc:complete -- novnc-local-demo http://127.0.0.1:3107/secure "S22 DEMO AUTH PASS"
```

Expected safe scan behavior:

```text
expectedText: found
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

## Cancel flow

If login is not needed or something looks wrong:

```bash
npm run session:manual-login:novnc:cancel -- novnc-local-demo
```

The cancel wrapper cancels the pending login job, attempts stale worker cleanup for the named profile, removes stale pid/done files, and stops local noVNC by default.

## Stop commands

If manual cleanup is needed:

```bash
npm run session:manual-login:novnc:cancel -- <profile>
npm run session:novnc:stop:local
npm run session:vnc:stop:stable
npm run session:demo:stop
```

## Reusable profile rule

Choose a profile name that explains the intended use.

Examples:

```text
novnc-local-demo
github-login-demo-novnc
rockwell-kb-user-novnc
linkedin-jobscan-novnc
```

Once saved, the agent can reuse the named profile with `browser_scan_with_profile` or the local profile scan helper. The user does not need to log in again until the target website expires or invalidates the session.

## Phase 7M proof run

Proof target:

```text
profile: novnc-local-demo
login URL: http://127.0.0.1:3107/login
secure URL: http://127.0.0.1:3107/secure
expected text: S22 DEMO AUTH PASS
```

Observed proof route:

```text
PC browser
  -> SSH local forward
  -> local noVNC 127.0.0.1:6080
  -> local VNC 127.0.0.1:5901
  -> Debian Chromium
  -> manual demo login
  -> storageState saved locally
  -> headless authenticated reuse scan
```

Completion output confirmed:

```text
status: completed
title: S22 Demo Secure Area
finalUrl: http://127.0.0.1:3107/secure
storageStatePath: .runtime/sessions/<profile>/storageState.json
PASS: manual login profile saved.
```

Authenticated reuse scan confirmed:

```text
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

## Hardening applied after first rough run

The first run worked, but was not smooth. The following hardening was added before the final PASS retest:

- cancel wrapper now attempts profile-specific stale worker cleanup
- start wrapper now cleans stale terminal job state before starting a new job
- status wrapper no longer reports a false safe listener result when `ss` is unavailable in Termux/Android
- manual login worker now launches Chromium with `--disable-setuid-sandbox` and supports additional `CHROMIUM_FLAGS`
- `SESSION_LOGIN_TIMEOUT_MS` is passed into the Debian proot worker path

## Known operator notes

- Termux SSH listener may need to be restarted with `sshd -p 8022` before the Windows SSH local forward accepts new connections.
- Chromium may print `error: expected absolute path: "--shm-helper"`; this was non-blocking in the proof runs because Chromium still opened the login page, storageState saved, and headless reuse scan passed.
- Android/Termux may deny `ss -ltnp` / netlink access; VNC status and noVNC tmux logs are used as practical local proof evidence.

## Acceptance criteria result

Phase 7M result:

- [x] local demo login can be started through the combined noVNC wrapper
- [x] Windows browser can control the login browser through SSH local forward
- [x] profile `novnc-local-demo` is saved under `.runtime/sessions/<profile>/`
- [x] local profile scan finds `S22 DEMO AUTH PASS`
- [x] `SESSION_SCAN_SUPPRESS_EXCERPT=1` suppresses page text excerpt
- [x] raw VNC `5901` is not publicly exposed
- [x] noVNC `6080` remains local-only
- [x] API `3001` and worker `3002` are not exposed
- [x] no public tunnel is started
- [x] no password/cookie/token/MFA/storageState value is printed
- [x] `.runtime/` artifacts do not appear in git status
- [x] demo server and VNC were stopped after proof

## Phase 7M decision

Phase 7M is complete.

Do not move to Phase 7N public protected noVNC proof until the operator intentionally starts that phase and the public route is temporary, protected, timeout-bound, and human-controlled.
