# Phase 7I — Repeat Authenticated Profile Verification

Date: 2026-07-01  
Status: PASS  
Mode: Local-only  
Public tunnel used: No

## Summary

Phase 7I repeated the authenticated manual-login profile flow using a second local-only verification target.

The test used a dummy GitHub account and a new profile:

- Profile: `github-login-demo-2`
- URL: `https://github.com/settings/appearance`
- Expected text: `Appearance`

The flow confirmed that a locally captured authenticated browser profile can be reused by both:

1. Direct profile-aware headless scan.
2. Local MCP `browser_scan_with_profile`.

No cookie, session, token, password, localStorage, sessionStorage, or raw `storageState` values were printed.

## Why Phase 7I Was Needed

Phase 7H proved the first real external login flow.

Phase 7I focused on repeatability and operational stability:

- Repeat the login capture with a fresh profile.
- Verify a second authenticated page.
- Improve VNC reliability for manual login.
- Keep the entire test local-only.
- Confirm excerpt suppression still works.

## Issue Encountered

The original VNC start wrapper could start TigerVNC briefly, but `session:vnc:status` later showed the VNC session as stale.

Example symptom:

```text
Xtigervnc (stale)
```

When Playwright tried to launch a headed browser, it failed because the X display was not available.

Example symptom:

```text
Missing X server or $DISPLAY
```

A later foreground VNC test worked, but the foreground process was tied to the SSH/MobaXterm session. If the SSH session disconnected, the VNC process died and aVNC disconnected.

## Fix Applied

A stable VNC wrapper was added.

The new flow is:

```text
Termux npm script
→ tmux session: s22vnc
→ Debian proot
→ Debian VNC foreground wrapper
→ Xtigervnc display :1 / local-only port 5901
→ aVNC on S22 connects to 127.0.0.1:5901
```

This keeps the VNC foreground process alive inside `tmux` instead of tying it directly to a normal SSH tab.

New scripts:

- `scripts/session-vnc-start-stable.sh`
- `scripts/session-vnc-stop-stable.sh`

New npm commands:

```bash
npm run session:vnc:start:stable
npm run session:vnc:stop:stable
```

## Local MCP Manual Login Flow

The local MCP server was started with public tunnel disabled.

The following MCP tools were used locally:

- `browser_start_manual_login`
- `browser_manual_login_status`
- `browser_complete_manual_login`
- `browser_scan_with_profile`

The manual login was completed through local aVNC only.

After login, completion status reported:

```text
status: completed
title: Appearance
finalUrl: https://github.com/settings/appearance
storageStatePath: .runtime/sessions/<profile>/storageState.json
metadataPath: .runtime/sessions/<profile>/metadata.json
Storage state saved locally only.
Secret values were not printed.
```

The placeholder `<profile>` was used in output. Raw storageState content was not printed.

## Direct Profile Scan Result

Command:

```bash
npm run session:profile:scan -- github-login-demo-2 https://github.com/settings/appearance "Appearance"
```

Result:

```text
profile: github-login-demo-2
url: https://github.com/settings/appearance
allowedDomain: github.com
title: Appearance
finalUrl: https://github.com/settings/appearance
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

## Local MCP Profile Scan Result

Tool:

```text
browser_scan_with_profile
```

Arguments:

```json
{
  "profile": "github-login-demo-2",
  "url": "https://github.com/settings/appearance",
  "expectedText": "Appearance"
}
```

Result:

```text
ok: true
title: Appearance
finalUrl: https://github.com/settings/appearance
textExcerpt: (suppressed by SESSION_SCAN_SUPPRESS_EXCERPT=1)
expectedText: found
PASS: profile-aware headless scan completed.
No cookie/session values were printed.
```

## Safety Notes

- Public Route A tunnel was not started.
- OpenAI tunnel was not started.
- MCP HTTP was used locally only.
- aVNC connected to `127.0.0.1:5901` on the S22 itself.
- Raw VNC was not exposed publicly.
- No cookie/session/token/password/storageState values were printed.
- `SESSION_SCAN_SUPPRESS_EXCERPT=1` suppressed authenticated page text excerpts.
- The GitHub account used was a dummy test account.

## Non-blocking Warning

Chromium/proot emitted this warning during the headed browser run:

```text
error: expected absolute path: "--shm-helper"
```

The warning did not block the result. Manual login completed and the direct + MCP profile scans passed.

## Acceptance Criteria

- Fresh profile created: PASS
- Manual login through local aVNC: PASS
- storageState saved locally only: PASS
- Direct profile scan expected text found: PASS
- Local MCP profile scan expected text found: PASS
- Authenticated text excerpt suppressed: PASS
- No cookie/session/token/password/storageState values printed: PASS
- Public tunnel not used: PASS
- Services stopped at end: PASS

## Outcome

Phase 7I passed.

The project now has a repeatable local-only authenticated verification flow with a more reliable tmux-held VNC lifecycle.
