# Phase 7P — Operator-Quality Profile Lifecycle Helpers

## Status

Implementation added.

Validation status:

```text
Static JavaScript syntax checks: PASS
Shell syntax checks: PASS
Local file-state classifier self-test: PASS
Live S22 Debian/Chromium profile probe: PENDING OPERATOR VERIFICATION
```

Phase 7P must not be called fully complete until the new `probe` and `ensure` commands have been exercised on the S22 with the existing safe GitHub dummy profile.

## Goal

Separate two different questions:

```text
1. Does a named profile exist locally and match the target domain?
2. Is the remote website session still authenticated now?
```

A profile file existing under `.runtime/` is not proof that the target website session is still valid.

## Added commands

```bash
npm run session:profile:status -- <profile> [target-url]
npm run session:profile:probe -- <profile> <authenticated-url> "<expected-text>"
npm run session:profile:ensure -- <profile> <authenticated-url> "<expected-text>" [login-url]
npm run session:profile:self-test
```

## State model

| State | Meaning | Exit code |
|---|---|---:|
| `missing` | One or both required profile artifacts are absent | `20` |
| `present_unverified` | Artifacts and metadata are readable, but no live browser probe was performed | `0` |
| `valid` | Live browser probe found the expected authenticated marker | `0` |
| `expired_or_logged_out` | Page loaded, but the expected authenticated marker was absent | `21` |
| `domain_mismatch` | Target host is outside the profile metadata allowlist | `22` |
| `runtime_error` | Invalid input, invalid JSON, browser/network/runtime failure, or another error prevented classification | `23` |

## `session:profile:status`

Purpose:

- inspect only local profile artifacts
- validate the safe profile name
- validate `storageState.json` and `metadata.json` as JSON objects
- read the metadata domain allowlist
- optionally compare a target URL with the allowlist
- never launch Chromium

A healthy existing profile returns:

```text
state: present_unverified
```

This state deliberately does not claim the remote login is valid.

## `session:profile:probe`

Purpose:

- reuse the saved profile inside Debian proot
- launch headless Chromium
- navigate to the authenticated target URL
- look for operator-supplied expected authenticated text
- classify the live result

Classification:

```text
expected marker found     -> valid
expected marker not found -> expired_or_logged_out
wrong target domain       -> domain_mismatch
browser/network failure   -> runtime_error
```

The page text excerpt is always suppressed by design. The command prints only safe summary fields such as state, profile, target host, page title, sanitized final URL, and whether the expected marker was found.

## `session:profile:ensure`

Purpose:

- run lightweight status first
- run a live probe only when the local profile is usable
- return success only when the profile is `valid`
- provide local manual-login refresh guidance when the profile is missing or appears logged out

Safety behavior:

- does not start VNC
- does not start noVNC
- does not start Cloudflare
- does not start any public route
- does not enter credentials
- does not echo supplied URLs in refresh guidance
- prints placeholders so the operator re-enters URLs locally in Termux

Public noVNC remains temporary and intentionally started only. It is never an automatic fallback.

## Files added

```text
tools/session-profile-common.mjs
tools/session-profile-status.mjs
tools/proot-playwright-worker/session-profile-probe.mjs
scripts/session-profile-status.sh
scripts/session-profile-probe.sh
scripts/session-profile-ensure.sh
scripts/session-profile-self-test.sh
```

`package.json` now exposes the four Phase 7P npm commands.

## Local classifier validation

The self-test creates disposable dummy artifacts under a temporary directory and covers:

```text
missing
present_unverified
domain_mismatch
runtime_error
```

It does not use or inspect a real profile.

Command:

```bash
npm run session:profile:self-test
```

Expected final output:

```text
PASS: Phase 7P local profile status self-test completed.
Covered: missing, present_unverified, domain_mismatch, runtime_error.
No cookie/session/token/password/MFA/storageState values were printed.
```

## Required S22 live verification

After pulling the latest `main` branch on the S22:

```bash
cd ~/projects/mobile-job-radar-agent
git pull --ff-only
npm run session:profile:self-test
```

Check the existing GitHub dummy profile without opening Chromium:

```bash
npm run session:profile:status -- github-manual-local https://github.com/settings/profile
```

Expected state:

```text
present_unverified
```

Run the live authenticated probe:

```bash
npm run session:profile:probe -- github-manual-local https://github.com/settings/profile "Public profile"
```

Expected state while the dummy GitHub session remains authenticated:

```text
valid
```

Run the reuse-first orchestration:

```bash
npm run session:profile:ensure -- github-manual-local https://github.com/settings/profile "Public profile" https://github.com/login
```

Expected result while valid:

```text
ENSURE RESULT: valid
```

These tests do not require VNC, noVNC, or any public tunnel.

## Safe negative verification

Unknown profile:

```bash
npm run session:profile:status -- phase7p-does-not-exist https://github.com/settings/profile
```

Expected state and exit code:

```text
missing
20
```

Wrong domain:

```bash
npm run session:profile:status -- github-manual-local https://example.com/
```

Expected state and exit code:

```text
domain_mismatch
22
```

Do not intentionally corrupt a real profile to test `runtime_error`.

## Security boundary

The helpers must never print or request:

- passwords
- cookies
- session tokens
- MFA codes
- `storageState.json` contents

Profile files remain under:

```text
.runtime/sessions/<profile>/
```

`.runtime/` remains ignored by Git.

API port `3001`, Playwright worker port `3002`, and raw VNC port `5901` remain local-only.

## Acceptance criteria

Repository-side implementation:

- [x] `session:profile:status` added
- [x] `session:profile:probe` added
- [x] `session:profile:ensure` added
- [x] six explicit states added
- [x] stable exit codes added
- [x] expected-text authenticated probe added
- [x] domain mismatch checked before Chromium launch
- [x] page excerpts suppressed
- [x] safe refresh placeholders added
- [x] no automatic VNC/noVNC/public route behavior
- [x] local classifier self-test added
- [x] static syntax checks passed
- [x] local classifier test passed outside the S22 runtime

S22 operator verification:

- [ ] self-test passes after `git pull --ff-only`
- [ ] existing GitHub profile status returns `present_unverified`
- [ ] GitHub live probe returns `valid`
- [ ] GitHub ensure returns `valid`
- [ ] unknown profile returns `missing`
- [ ] wrong domain returns `domain_mismatch`
- [ ] no secret values are printed
- [ ] VNC/noVNC/public tunnel remain off
- [ ] `git status --short` remains clean

## Decision

Phase 7P implementation is ready for S22 operator verification.

Do not mark Phase 7P fully PASS until the live Debian proot Chromium checks have completed on the device.
