# Phase 7D — Profile-aware Headless Scan Integration

Phase 7D integrates the Session Gateway into the scanner: authenticated pages can be scanned using a named local session profile captured through user-controlled AVNC login on the S22. Credentials and cookies never leave the device and are never sent to ChatGPT.

## Scope

This phase adds a lightweight local helper only. It proves that a named session profile can be reused for a headless scan without starting VNC and without printing cookies, session tokens, storageState JSON, authorization headers, or passwords.

Real external login targets such as LinkedIn or Rockwell are intentionally deferred until the local demo scan is committed and clean.

## Files

- `tools/proot-playwright-worker/session-profile-scan.mjs`
- `scripts/session-profile-scan.sh`
- `docs/session-gateway-profile-scan.md`

## Commands

Start the local demo server:

```bash
npm run session:demo:start
```

Run the profile-aware scan demo:

```bash
npm run session:profile:scan:demo
```

Equivalent explicit command:

```bash
npm run session:profile:scan -- local-login-demo http://127.0.0.1:3107/secure "S22 DEMO AUTH PASS"
```

Stop the local demo server:

```bash
npm run session:demo:stop
```

## Expected PASS output

The output should include:

```text
profile: local-login-demo
url: http://127.0.0.1:3107/secure
allowedDomain: 127.0.0.1
title: S22 Demo Secure Area
finalUrl: http://127.0.0.1:3107/secure
S22 DEMO AUTH PASS
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

## Safety boundaries

- The helper accepts a named profile, not a storageState path.
- Profile names must match `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.
- Storage state is resolved internally from `.runtime/sessions/<profile>/storageState.json`.
- Metadata is resolved internally from `.runtime/sessions/<profile>/metadata.json`.
- Target URL host must match the profile metadata allowlist.
- VNC is not started by this helper.
- Cookies, tokens, storageState content, authorization headers, and passwords are never printed.
- Runtime artifacts remain under `.runtime/` and must not be committed to git.

## Portfolio note

This phase demonstrates a safe authenticated scanning pattern for mobile-first automation: the user performs login locally through AVNC, the device stores the browser session locally, and later headless scans reuse only a named local profile.

## Phase 7E — Proof Guard Hardening

Phase 7E adds a proof guard wrapper around the profile-aware scan helper. It does not change the core scanner logic. The guard checks that the helper file is not empty or truncated, confirms key safety markers exist, runs the profile scan when requested, and fails unless the safe PASS output is found.

New commands:

```bash
npm run session:profile:guard
npm run session:profile:proof -- <profile> <url> <expectedText>
npm run session:profile:proof:demo
```

Recovery lesson from Phase 7D:

A JavaScript helper file can be empty and still pass `node --check`. Therefore syntax checks alone are not enough. The proof guard must check file size, required code markers, and actual scan PASS output before committing.

The proof guard must never print cookies, storageState JSON, authorization headers, passwords, or session tokens.
