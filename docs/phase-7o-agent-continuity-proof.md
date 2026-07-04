# Phase 7O — Agent Continuity After Safety Gates

## Status

PASS for local demo continuity and real GitHub dummy-account reuse.

Phase 7O proves that a saved Playwright `storageState` profile can be reused by the S22 Web Agent without opening noVNC and without repeating manual login every time.

## Goal

Answer the practical question:

```text
After a human logs in once and the profile is saved locally, can the agent reuse that login session repeatedly?
```

Validated answer:

```text
Yes, for the local demo profile and a real GitHub dummy account.
```

## Safety boundary

Phase 7O kept the same safety boundary from Phases 7M and 7N:

- Do not print passwords.
- Do not print cookies.
- Do not print session tokens.
- Do not print MFA codes.
- Do not print `.runtime/sessions/<profile>/storageState.json`.
- Keep profile artifacts under `.runtime/` only.
- Keep `.runtime/` ignored by git.
- Use dummy/safe accounts for external website proof.
- Keep public noVNC off for the real website reuse test.

## Profiles used

```text
novnc-public-demo
  Local demo profile captured during Phase 7N public noVNC proof.

github-manual-local
  GitHub dummy-account profile captured through local noVNC only.
```

## Phase 7O-A / 7O-B — Demo profile continuity

The local demo server was patched before the Phase 7O continuity test so demo login validation can survive a server restart.

Patch:

```text
3053ac8 Use persistent demo auth secret for Phase 7O reuse tests
```

New demo behavior:

```text
.runtime/session-demo-auth-secret
```

This file lets the demo server validate previously issued demo auth cookies after the demo server or S22 restarts, as long as `.runtime/` is not deleted.

Validated command:

```bash
npm run session:demo:start
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:profile:scan -- novnc-public-demo http://127.0.0.1:3107/secure "S22 DEMO AUTH PASS"
```

Observed PASS:

```text
title: S22 Demo Secure Area
finalUrl: http://127.0.0.1:3107/secure
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

Result:

```text
Phase 7O-A PASS: saved local demo profile can be reused without noVNC.
Phase 7O-B PASS: saved local demo profile survives S22 restart when `.runtime/` files remain.
```

## Phase 7O-C — Real website dummy login capture and reuse

Target:

```text
https://github.com/login
```

Profile:

```text
github-manual-local
```

The first real website continuity proof used local noVNC only:

```bash
SESSION_LOGIN_TIMEOUT_MS=1200000 npm run session:manual-login:novnc:start -- github-manual-local https://github.com/login
```

The operator logged into a GitHub dummy account manually through local noVNC.

Completion command:

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:manual-login:novnc:complete -- github-manual-local https://github.com/settings/profile "Public profile"
```

Observed completion state:

```text
status: completed
profile: github-manual-local
url: https://github.com/login
title: GitHub
finalUrl: https://github.com/
allowedDomains: github.com
storageStatePath: .runtime/sessions/<profile>/storageState.json
metadataPath: .runtime/sessions/<profile>/metadata.json
```

Observed authenticated scan:

```text
profile: github-manual-local
url: https://github.com/settings/profile
allowedDomain: github.com
title: Your profile
finalUrl: https://github.com/settings/profile
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

Result:

```text
Phase 7O-C PASS: real GitHub dummy session was saved and reused for an authenticated scan.
```

## Phase 7O-D — Repeated real profile reuse after noVNC/VNC stop and SSH reconnect

After the GitHub dummy profile was saved:

- local noVNC was stopped
- stable VNC was stopped
- Chromium/VNC test processes were stopped
- SSH disconnected and was reconnected
- the same `github-manual-local` profile scan was run again

Repeated command:

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:profile:scan -- github-manual-local https://github.com/settings/profile "Public profile"
```

Observed repeated PASS:

```text
title: Your profile
finalUrl: https://github.com/settings/profile
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

Result:

```text
Phase 7O-D PASS: real GitHub dummy profile can be reused repeatedly without noVNC and without login again.
```

Important precision:

```text
GitHub dummy reuse after SSH reconnect: PASS.
GitHub dummy reuse after full S22 restart: not yet separately tested.
```

The local demo profile has already proven reuse after S22 restart because the demo server now has persistent local auth validation.

## Cleanup result

Final cleanup commands:

```bash
npm run session:novnc:stop:local || true
npm run session:vnc:stop:stable || true
npm run session:demo:stop || true
npm run session:novnc:public-temp:status -- s22login.aidesk.rest
npm run session:novnc:public-temp:tunnel:status
git status --short
```

Final safe state:

```text
VNC sessions: none
local noVNC tmux: not running
No 5901/6080 listeners reported
manual login job github-manual-local: completed
cloudflared public-temp tmux: not running
cloudflared process: not found
```

## Notes and limitations

- SSH disconnects happened during heavy runtime load, especially while using remote display tools with VNC/noVNC/Chromium.
- These SSH disconnects did not invalidate saved profiles.
- Real websites can expire sessions according to their own security rules.
- If a real website invalidates a session, the reuse scan should fail safely and the operator can repeat manual login.
- Public noVNC was not used for the GitHub dummy proof. This was intentional to reduce risk.

## Acceptance criteria

- [x] Saved demo profile can be reused without noVNC.
- [x] Saved demo profile survives S22 restart.
- [x] Real GitHub dummy profile can be captured through local noVNC.
- [x] Real GitHub dummy profile can scan an authenticated page.
- [x] Real GitHub dummy profile can be reused after noVNC/VNC stop.
- [x] Real GitHub dummy profile can be reused after SSH reconnect.
- [x] `SESSION_SCAN_SUPPRESS_EXCERPT=1` suppresses authenticated text excerpts.
- [x] No cookie/session/token/password/storageState values are printed.
- [x] Public noVNC tunnel remains off during real website reuse proof.
- [x] Final runtime cleanup confirms no local noVNC/VNC/public-temp tunnel is running.

## Decision

Phase 7O is complete for:

```text
local demo continuity
real GitHub dummy-account repeated reuse
```

Recommended next phase:

```text
Phase 7P — operator-quality continuity helpers
```

Phase 7P should make reuse-first workflows easier:

- `session:profile:status`
- `session:profile:ensure`
- clear `valid / expired / missing` output
- fail-safe manual-login fallback instructions
- no automatic public noVNC start
