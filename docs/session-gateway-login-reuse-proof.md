# Phase 7C-3 — Local Demo Login Capture + Headless Reuse Proof

Status: PASS  
Phase: User-Controlled Session Gateway / Option B

## Purpose

This proof validates the complete local login session flow:

```text
Manual login in AVNC
  -> Playwright storageState capture
  -> VNC stopped
  -> headless Playwright reuse
  -> protected page content read successfully
```

## Test target

A local-only demo login server was added for safe testing.

- Server URL: `http://127.0.0.1:3107`
- Login URL: `http://127.0.0.1:3107/login`
- Protected URL: `http://127.0.0.1:3107/secure`
- Demo username: `akmal`
- Demo password: `demo123`
- Profile: `local-login-demo`

The demo credential is not a real account credential.

## Result

PASS.

Manual VNC capture created local runtime artifacts:

```text
.runtime/sessions/local-login-demo/storageState.json
.runtime/sessions/local-login-demo/metadata.json
```

The headless reuse check then loaded the stored profile and successfully read the protected page.

Expected text found:

```text
S22 DEMO AUTH PASS
```

Observed headless reuse result:

```text
title: S22 Demo Secure Area
finalUrl: http://127.0.0.1:3107/secure
PASS: expected text found: S22 DEMO AUTH PASS
```

## Security result

- No real website credential was used.
- No password, cookie value, token, or storageState content was sent to ChatGPT.
- Session artifacts stayed under `.runtime/`.
- `.runtime/` did not appear in `git status`.
- VNC was stopped after capture.
- Demo server was stopped after the proof.

## Commands used

Start demo server:

```bash
npm run session:demo:start
```

Capture manually through Debian VNC:

```bash
DISPLAY=:1 node tools/proot-playwright-worker/session-capture.mjs \
  --profile local-login-demo \
  --url http://127.0.0.1:3107/login \
  --domain 127.0.0.1
```

Check stored profiles:

```bash
npm run session:capture:status
```

Headless reuse proof:

```bash
npm run session:reuse:check -- local-login-demo http://127.0.0.1:3107/secure "S22 DEMO AUTH PASS"
```

Stop demo server:

```bash
npm run session:demo:stop
```

## Notes

This proof intentionally uses a local demo site before trying real websites. External websites may apply additional anti-bot, device binding, IP binding, or server-side session rules. The local proof confirms that the S22 Session Gateway capture/reuse mechanism itself works.
