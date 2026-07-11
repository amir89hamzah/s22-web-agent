# Phase 7O-E — Long-Gap Session Continuity

## Status

PASS.

A real GitHub dummy-account Playwright profile remained usable after the Samsung S22 was fully powered off for approximately one week.

## Goal

Verify that an authenticated profile saved under `.runtime/sessions/<profile>/` can survive a long offline gap and full device restart without reopening VNC/noVNC or repeating manual login.

## Profile and target

```text
profile: github-manual-local
target: https://github.com/settings/profile
expected authenticated text: Public profile
```

## Test conditions

Before this proof:

- the GitHub dummy account had already been logged in manually
- Playwright `storageState` had been saved locally
- VNC and noVNC had been stopped
- the S22 was powered off for approximately one week
- no session file was copied out of `.runtime/`

After powering the S22 back on:

- SSH was reconnected
- VNC was not started
- noVNC was not started
- the user did not log in again
- the existing profile was reused directly in headless mode

## Command

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:profile:scan -- github-manual-local https://github.com/settings/profile "Public profile"
```

## Observed result

```text
title: Your profile
finalUrl: https://github.com/settings/profile
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

## Result

The real GitHub dummy authenticated session survived:

- full S22 power-off and restart
- approximately one week offline
- runtime shutdown
- SSH reconnect
- repeated headless profile reuse

This extends the earlier Phase 7O proof from immediate/repeated reuse to long-gap continuity.

## Security boundary

The proof did not request or print:

- passwords
- cookies
- session tokens
- MFA codes
- `storageState.json` contents

The profile remained local under `.runtime/`, which is ignored by Git.

VNC/noVNC was not needed for reuse and no public noVNC route was started.

## Important limitation

A profile file existing on disk does not guarantee that a remote website session remains valid forever.

Remote websites may expire, revoke, or challenge sessions according to their own security controls. A future helper must therefore distinguish between:

```text
missing
present_unverified
valid
expired_or_logged_out
domain_mismatch
runtime_error
```

## Decision

Phase 7O-E is complete.

Recommended next work:

```text
Phase 7P-0 — reconcile repo documentation
Phase 7P   — operator-quality profile status, probe, and ensure helpers
```

The Phase 7P fallback must remain human-controlled and must never auto-start public noVNC.
