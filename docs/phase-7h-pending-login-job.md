# Phase 7H — Pending Manual Login Job

Phase 7H adds a controlled manual-login workflow before the first real external login trial.

## Purpose

The goal is to let the user start a manual login job through MCP, complete login in local aVNC/noVNC, then confirm completion through MCP or SSH.

The system saves a named local session profile after the user confirms login is complete.

## New flow

```text
MCP start manual login job
↓
S22 opens local Chromium through Debian proot / VNC display
↓
User logs in manually in aVNC/noVNC
↓
User confirms completion through MCP or SSH
↓
Worker saves .runtime/sessions/<profile>/storageState.json locally
↓
Worker saves .runtime/sessions/<profile>/metadata.json locally
↓
browser_scan_with_profile can scan using profile name only
```

## New helper scripts

- `scripts/session-manual-login-start.sh <profile> <url>`
- `scripts/session-manual-login-status.sh <profile>`
- `scripts/session-manual-login-complete.sh <profile>`
- `scripts/session-manual-login-cancel.sh <profile>`
- `tools/proot-playwright-worker/session-manual-login-worker.mjs`

## New MCP tools

- `browser_start_manual_login`
- `browser_manual_login_status`
- `browser_complete_manual_login`
- `browser_cancel_manual_login`

## Profile naming

Recommended profile names:

- `github-login-demo`
- `rockwell-login-demo`
- `linkedin-login-demo`

Do not include passwords, email addresses, bearer tokens, client secrets, or confidential project names in profile names.

## Safety boundary

The pending login MCP tools accept only profile and URL where applicable.

They must not accept:

- password
- cookie
- token
- storageState JSON
- storageState path
- raw browser profile path
- localStorage/sessionStorage values

Runtime artifacts remain under `.runtime/` and must not be committed.

## Text excerpt hygiene

For authenticated pages, page body text can contain private information even if cookies are not printed.

Phase 7H therefore supports `SESSION_SCAN_SUPPRESS_EXCERPT=1` so profile scans can show title, URL, and PASS/FAIL without printing page body excerpts.

MCP `browser_scan_with_profile` suppresses text excerpts by default.

## Real external login rule

The first external login trial must be local-only:

- public tunnel off;
- use an account owned by the user;
- manual login only through aVNC/noVNC;
- no password/cookie/token/storageState pasted into ChatGPT, MCP args, shell history, docs, or Git;
- scan only one safe logged-in page first.

## Suggested first real target

GitHub is recommended for the first controlled external trial because it is portfolio-relevant and easier to validate than LinkedIn.

Suggested profile:

```text
github-login-demo
```

Suggested validation page after login:

```text
https://github.com/settings/profile
```

Suggested expected text:

```text
Public profile
```

## Exit criteria

Phase 7H plumbing is complete when:

- helper scripts exist;
- MCP tools appear in tools/list;
- local start/status/complete/cancel commands work;
- direct profile scan can run with `SESSION_SCAN_SUPPRESS_EXCERPT=1`;
- no cookie/session/token/password/storageState values are printed;
- public tunnel remains off;
- main is clean and pushed.
