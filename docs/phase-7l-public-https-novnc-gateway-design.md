# Phase 7L — Public HTTPS noVNC Gateway Design and Safety Contract

## Status

Design only.

No public tunnel was started in this phase.

## Purpose

Phase 7L designs the future public HTTPS noVNC gateway for remote manual login.

This phase does not implement the public gateway. It defines the security boundary, lifecycle, operator workflow, and future implementation checklist before any public exposure is attempted.

## Background

Phase 7H proved real external manual login locally using a dummy GitHub profile and local storageState.

Phase 7I improved stability by adding tmux-held Debian proot VNC wrappers and proved another local-only authenticated verification.

Phase 7J documented the remote manual login gateway concept.

Phase 7K proved local noVNC access:

```text
Browser on S22 or Windows PC via SSH local forward
  -> local noVNC on 127.0.0.1:6080
  -> local-only VNC on 127.0.0.1:5901
  -> Debian proot Chromium session
```

Phase 7L now designs the safe public HTTPS version of that route.

## Design goal

The future route should allow a human user to open a temporary HTTPS noVNC login page, manually log in to a website, then notify the agent that login is complete.

After the user confirms login completion, the S22 agent should save Playwright storageState locally and close the remote login route.

## Non-goals

Phase 7L does not:

- start Cloudflare tunnel
- create a public noVNC hostname
- expose raw VNC `5901`
- expose API `3001`
- expose Playwright worker `3002`
- automate password entry
- bypass MFA or website login controls
- print cookies, tokens, passwords, or storageState contents
- run authenticated public scans

## Future target architecture

```text
User browser
  -> temporary HTTPS noVNC login URL
  -> Cloudflare Route A
  -> local gateway entrypoint on S22
  -> local noVNC/websockify
  -> 127.0.0.1:5901 VNC
  -> Debian proot Chromium
  -> manual login by user
```

## Important adapter concept

noVNC is only an adapter.

It converts:

```text
browser HTTPS page
  -> WebSocket noVNC session
  -> local VNC protocol
```

It must not change the safety rule that raw VNC remains local-only.

## Safety boundary

The following must never be exposed publicly:

```text
127.0.0.1:5901  raw VNC
127.0.0.1:3001  API server
127.0.0.1:3002  Playwright worker
```

The following may be exposed only in a future controlled temporary login session:

```text
temporary HTTPS noVNC login route
```

The public noVNC route must be:

- temporary
- explicitly started by the operator or agent
- protected by a one-time or short-lived access mechanism
- stopped immediately after login completion
- stopped automatically on timeout
- never reused as a permanent remote desktop

## Preferred future public route

Cloudflare Route A remains the preferred future public route.

Reason:

- Route A is already proven for MCP-style public routing.
- It can provide an HTTPS endpoint.
- It can avoid exposing raw local ports directly.
- It fits the existing S22 Web Agent operator model.

OpenAI Secure MCP Tunnel remains parked for later MCP-only review because it is not the main target for noVNC browser UI routing.

## Public route design rule

The future route should expose a purpose-built login gateway URL, not raw local ports.

Preferred future shape:

```text
https://<temporary-login-host-or-path>/login/<jobId>
```

The public URL should not directly reveal internal ports like:

```text
5901
6080
3001
3002
```

## Manual login job lifecycle

Future implementation should use a manual login job lifecycle:

```text
1. Agent creates pending manual login job.
2. Agent starts stable local VNC.
3. Agent starts local noVNC.
4. Agent creates temporary HTTPS login route.
5. Agent gives user the temporary login URL.
6. User opens the noVNC page in browser.
7. User manually logs in.
8. User tells agent: "I have logged in".
9. Agent completes manual login job.
10. Agent saves storageState locally.
11. Agent stops temporary HTTPS login route.
12. Agent stops noVNC if no longer needed.
13. Agent scans authenticated page with SESSION_SCAN_SUPPRESS_EXCERPT=1.
```

## Login job states

Future job state model:

```text
created
starting_vnc
starting_novnc
waiting_for_user_login
user_reported_done
saving_storage_state
completed
failed
expired
cancelled
```

## Timeout rule

Every remote login job must have a timeout.

Recommended starting timeout:

```text
15 minutes
```

After timeout:

- public HTTPS noVNC route must stop
- noVNC session should stop if not needed
- job state should become `expired`
- no storageState should be overwritten unless the login completion step was explicitly reached

## Kill switch

A simple kill switch must exist before any public implementation.

Minimum future kill commands:

```bash
npm run session:novnc:stop:local
npm run session:vnc:stop:stable
npm run route:a:stop
```

If a dedicated public noVNC tunnel helper is added later, it must also have:

```bash
npm run session:novnc:stop:public
```

## Access control design

The future public login route should require at least one of these controls:

- short-lived random login URL
- one-time token
- Cloudflare Access
- MCP-authorized job creation with separate noVNC URL token

Preferred design:

```text
agent creates login job
agent creates one-time noVNC URL token
token expires after timeout
token is invalidated after job completion
```

The noVNC route should not be open permanently.

## StorageState rule

storageState must remain local:

```text
.runtime/sessions/<profile>/
```

Future implementation must never print:

- cookies
- session values
- storageState JSON
- passwords
- MFA codes
- bearer tokens
- Cloudflare tokens
- GitHub tokens

Only safe metadata may be printed, such as:

```text
profile name
storageState saved: yes/no
storageState byte size
expected text found: yes/no
textExcerpt suppressed
```

## Authenticated scan rule

Any authenticated scan after manual login should use:

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1
```

Expected safe result behavior:

- `ok: true`
- expected text found
- title may be shown
- URL may be shown
- textExcerpt suppressed
- no cookie/session/token/password/storageState values printed

## Human control rule

Manual login remains human-controlled.

The agent should not:

- type passwords automatically
- ask the user to paste passwords into chat
- ask the user to paste cookies or storageState
- bypass MFA
- operate hidden login sessions without the user knowing

The user must be able to see the browser session and decide when login is complete.

## Threat model

### Risk: raw VNC exposure

Impact:

- anyone with access could control the browser session

Control:

- never expose `5901`
- bind VNC to localhost
- expose only the HTTPS noVNC adapter in a controlled temporary route

### Risk: persistent remote desktop

Impact:

- public noVNC could become an unattended remote desktop

Control:

- short timeout
- explicit job lifecycle
- kill switch
- no permanent route

### Risk: token or cookie leakage

Impact:

- account compromise

Control:

- never print secrets
- suppress authenticated scan excerpts
- storageState local only
- use safe metadata only

### Risk: wrong service exposed

Impact:

- API or Playwright worker exposed to internet

Control:

- never map `3001` or `3002` to public hostnames
- use explicit route scripts
- document route mapping before start
- verify public host only reaches noVNC login gateway

### Risk: user leaves login session open

Impact:

- account remains accessible through remote browser

Control:

- timeout
- completion step stops public route
- operator stop command
- browser can be closed after storageState save

### Risk: public link shared accidentally

Impact:

- unauthorized browser control during login window

Control:

- one-time token
- short expiry
- optional Cloudflare Access
- invalidate token on completion

## Future implementation phases

Suggested next phases:

```text
Phase 7M — Local noVNC-assisted manual login job integration
Phase 7N — Temporary public HTTPS noVNC implementation
Phase 7O — Public noVNC login trial with dummy account
Phase 7P — Authenticated scan via public-assisted login, with excerpt suppression
```

## Phase 7L completion criteria

Phase 7L is complete when:

- this design document is committed
- TODO is updated
- no public tunnel was started
- no raw VNC was exposed
- no API or Playwright worker was exposed
- no secrets were printed

## Final Phase 7L decision

Do not implement public noVNC until the local job lifecycle is defined well enough to safely start, complete, timeout, and stop a manual login session.
