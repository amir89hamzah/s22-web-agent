# Phase 7H — First Controlled Real External Login Trial Result

Phase 7H tested a real external login flow using a dummy GitHub account.

## Scope

This was a local-only controlled trial.

- Public tunnel: not used
- MCP HTTP: local only
- Target type: external authenticated website
- Target site: GitHub
- Profile name: `github-login-demo`
- Login method: manual login through local aVNC/VNC browser
- Password/cookie/token/storageState passed through MCP: no
- Page body text printed by MCP: no

## Flow tested

```text
manual login through VNC
↓
complete pending manual login job
↓
save local session profile
↓
direct profile scan
↓
local MCP browser_scan_with_profile
↓
Playwright opens logged-in GitHub settings page
↓
expected text found
```

## Result summary

Manual login capture:

- Result: PASS
- Final URL: `https://github.com/settings/profile`
- Title: `Your profile`
- Storage state: saved locally under `.runtime/sessions/<profile>/`
- Secret values printed: no

Direct profile scan:

- Result: PASS
- Expected text: `Public profile`
- Text excerpt suppression: PASS
- Cookie/session values printed: no

Local MCP profile scan:

- Result: PASS
- Tool: `browser_scan_with_profile`
- Profile: `github-login-demo`
- URL: `https://github.com/settings/profile`
- Expected text: `Public profile`
- Text excerpt suppression: PASS
- Cookie/session values printed: no

## Issues found and fixed

During the trial, two environment propagation issues were found and fixed:

1. Manual login display argument was not passed correctly into Debian proot.
2. `SESSION_SCAN_SUPPRESS_EXCERPT=1` was not reaching the scan worker through the Termux/Debian wrapper and MCP path.

The MCP `browser_scan_with_profile` path now suppresses authenticated page excerpts by default.

## Safety notes

Runtime artifacts are intentionally local and ignored by Git:

- `.runtime/manual-login-jobs/`
- `.runtime/sessions/`
- `.runtime/tmp/`

Do not commit storageState, cookies, tokens, localStorage, sessionStorage, screenshots of private pages, or raw authenticated page text.

## Phase 7H outcome

Phase 7H proved that S22 Web Agent can reuse a manually captured external login session through a named local profile and scan an authenticated page through local MCP without exposing credentials, cookies, tokens, storageState JSON, or page body excerpts.
