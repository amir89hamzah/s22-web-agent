# S22 Web Agent — Engineering Roadmap

This file tracks the current engineering state of the Samsung S22-hosted MCP and browser-automation project.

## Current status

Latest repository reconciliation phase:

```text
Phase 7P-0 — documentation reconciliation
```

Status:

- [x] Review latest repository state
- [x] Confirm latest main commit before changes was `ab2e2e8`
- [x] Confirm working tree reported clean by operator
- [x] Reconcile `README.md`
- [x] Reconcile `TODO.md`
- [x] Reconcile `llm-index.yaml`
- [x] Document Phase 7O-E long-gap session continuity
- [x] Preserve all existing security boundaries

Latest important proof:

```text
Phase 7O-E — long-gap session continuity: PASS
```

The real GitHub dummy profile `github-manual-local` survived a full S22 power-off/restart and approximately one week offline. The authenticated profile scan passed without starting VNC/noVNC and without logging in again.

## Completed core capabilities

- [x] Run Node.js project on Samsung S22 through Termux
- [x] Store scanner output in SQLite
- [x] Generate Markdown reports
- [x] Provide CLI scanner commands
- [x] Provide local HTTP API on port `3001`
- [x] Provide MCP stdio server
- [x] Provide MCP Streamable HTTP server on port `3003`
- [x] Provide Debian proot Playwright worker on port `3002`
- [x] Provide browser-rendered MCP tools
- [x] Provide Route A public MCP proof through Cloudflare Named Tunnel
- [x] Provide OpenAI Secure MCP Tunnel proof
- [x] Provide VNC and stable tmux-held VNC helpers
- [x] Provide local noVNC gateway
- [x] Provide temporary public noVNC proof protected by Cloudflare Access
- [x] Provide Playwright `storageState` capture
- [x] Provide named session profiles with domain allowlists
- [x] Provide local profile-aware authenticated scan
- [x] Provide MCP `browser_scan_with_profile`
- [x] Provide pending manual-login MCP tools
- [x] Prove real GitHub dummy-account login and authenticated scan
- [x] Prove profile reuse without reopening noVNC
- [x] Prove profile reuse after S22 restart and a long offline gap

## Security rules

These rules remain mandatory for all future phases:

- [x] Never request or print passwords
- [x] Never request or print cookies
- [x] Never request or print session tokens
- [x] Never request or print MFA codes
- [x] Never print or paste `storageState.json` contents
- [x] Keep `.runtime/` session artifacts out of Git
- [x] Keep API port `3001` local-only
- [x] Keep Playwright worker port `3002` local-only
- [x] Keep raw VNC port `5901` local-only
- [x] Expose MCP port `3003` only through an intentional controlled route
- [x] Keep noVNC port `6080` local-only by default
- [x] Keep any public noVNC route temporary and intentionally started
- [x] Never auto-start public noVNC as a fallback
- [x] Keep tunnel tokens and MCP tokens out of Git
- [ ] Rotate the Cloudflare tunnel token before future public testing because it appeared in early raw logs
- [x] Do not upgrade npm to a new major version during this phase merely because an update notice appears
- [x] Do not propose Termux F-Droid migration by default

## Session gateway phase history

### Phase 7A — User-controlled session gateway design

Status: COMPLETE.

- [x] Document cookie JSON import as an optional path
- [x] Select Playwright manual login through VNC as the preferred practical path
- [x] Define local-only session artifact storage
- [x] Define no-password/no-cookie/no-token boundary
- [x] Keep OAuth separate from target-website login

### Phase 7B — Cookie JSON import

Status: DEFERRED.

Reason:

Playwright `storageState` captured through a user-controlled browser is more complete and reliable than cookie-only import for the current project.

Possible later work:

- [ ] Define Android Download-folder cookie inbox
- [ ] Validate imported profile and domain allowlist
- [ ] Import without logging secret values
- [ ] Prove imported artifacts remain under `.runtime/`

### Phase 7C — VNC, capture, and local reuse

Status: PASS.

- [x] Local TigerVNC baseline
- [x] Visible Chromium through VNC
- [x] Session Capture Mode
- [x] Local demo login capture
- [x] Headless reuse proof

### Phase 7D — Profile-aware headless scan

Status: PASS.

- [x] Named profile input
- [x] Safe profile-name validation
- [x] Internal storageState path resolution
- [x] Domain allowlist enforcement
- [x] Expected-text verification

### Phase 7E — Proof guard hardening

Status: PASS.

- [x] Guard against empty or truncated helper files
- [x] Require safe PASS output
- [x] Document recovery lesson

### Phase 7F — MCP profile scan integration

Status: PASS.

- [x] Add `browser_scan_with_profile`
- [x] Reuse existing profile helper
- [x] Limit MCP arguments to profile, URL, and optional expected text
- [x] Keep arbitrary storageState paths out of MCP input

### Phase 7G — Pre-login cleanup

Status: COMPLETE.

- [x] Document safety boundary before real external login
- [x] Confirm session artifacts are ignored by Git
- [x] Confirm public tunnel remains off during first real login trial
- [x] Suppress authenticated page excerpts

### Phase 7H — Real GitHub dummy login

Status: PASS.

- [x] Manual login through local VNC
- [x] Save named profile locally
- [x] Direct authenticated scan passed
- [x] MCP authenticated scan passed
- [x] No secret values printed

### Phase 7I — Stable VNC and repeated verification

Status: PASS.

- [x] Add tmux-held stable VNC wrapper
- [x] Repeat real GitHub dummy login with a second profile
- [x] Verify authenticated profile reuse
- [x] Stop services after test

### Phase 7J — Remote manual-login gateway design

Status: COMPLETE — DESIGN ONLY.

- [x] Separate MCP command route from human login route
- [x] Select HTTPS noVNC as the future remote-login UX
- [x] Forbid public raw VNC
- [x] Require temporary protected public route

### Phase 7K — Local noVNC proof

Status: PASS.

- [x] Local noVNC on `127.0.0.1:6080`
- [x] Forward to local VNC on `127.0.0.1:5901`
- [x] Keep public tunnel off

### Phase 7L — Public HTTPS noVNC design

Status: COMPLETE — DESIGN ONLY.

- [x] Define temporary public login hostname
- [x] Require Cloudflare protection
- [x] Keep API `3001` and worker `3002` private
- [x] Keep raw VNC `5901` private

### Phase 7M — Local noVNC-assisted manual-login integration

Status: PASS.

- [x] Combined start/status/complete/cancel flow
- [x] Local demo login through browser-based noVNC
- [x] Save profile and verify headless reuse
- [x] Harden stale process cleanup
- [x] Keep all routes local-only

### Phase 7N — Temporary protected public noVNC proof

Status: PASS.

- [x] Separate hostname for login route
- [x] Cloudflare Access protection
- [x] Temporary cloudflared connector lifecycle
- [x] Public noVNC demo login proof
- [x] Local storageState capture
- [x] Headless reuse verification
- [x] Runtime cleanup after proof
- [ ] Rotate exposed historical tunnel token before another public test

### Phase 7O — Agent continuity after safety gates

Status: PASS.

- [x] Reuse saved local demo profile without noVNC
- [x] Reuse saved demo profile after S22 restart
- [x] Capture real GitHub dummy profile through local noVNC
- [x] Reuse real profile after noVNC/VNC stop
- [x] Reuse real profile after SSH reconnect
- [x] Keep public noVNC off during real-site proof

### Phase 7O-E — Long-gap continuity

Status: PASS.

- [x] Power S22 off for approximately one week
- [x] Power S22 back on
- [x] Reconnect SSH
- [x] Do not start VNC
- [x] Do not start noVNC
- [x] Do not repeat login
- [x] Reuse `github-manual-local`
- [x] Find expected authenticated text `Public profile`
- [x] Suppress page excerpt
- [x] Print no cookie/session values

Proof document:

```text
docs/phase-7o-e-long-gap-session-continuity.md
```

## Next recommended phase

## Phase 7P — Operator-quality profile lifecycle helpers

Goal:

Make saved-profile reuse easy to understand and fail safely without confusing file existence with remote website validity.

### 7P-1 — `session:profile:status`

- [ ] Add a lightweight local file/metadata inspection command
- [ ] Do not launch Chromium
- [ ] Validate safe profile name
- [ ] Detect missing profile artifacts
- [ ] Detect invalid metadata or unreadable files
- [ ] Optionally compare a target URL against the profile domain allowlist
- [ ] Return `present_unverified` when files exist but no live website probe was performed

### 7P-2 — `session:profile:probe`

- [ ] Launch headless Chromium inside Debian proot
- [ ] Require named profile and target URL
- [ ] Use expected authenticated text as the validity marker
- [ ] Return `valid` only when the authenticated marker is found
- [ ] Return `expired_or_logged_out` when navigation succeeds but the marker is absent
- [ ] Return `domain_mismatch` before browser launch when target host is not allowed
- [ ] Return `runtime_error` for browser, network, parsing, or runtime failures
- [ ] Continue suppressing authenticated text excerpts by default
- [ ] Never print cookie/session/storageState values

### 7P-3 — `session:profile:ensure`

- [ ] Run status and probe in a clear reuse-first flow
- [ ] Exit successfully only for `valid`
- [ ] Print safe local manual-login refresh instructions for missing or expired profiles
- [ ] Allow an operator-supplied login URL for refresh guidance
- [ ] Never start VNC/noVNC automatically
- [ ] Never start Cloudflare or any public route automatically
- [ ] Never perform automatic credential entry

### Required Phase 7P states

```text
missing
present_unverified
valid
expired_or_logged_out
domain_mismatch
runtime_error
```

### Phase 7P acceptance criteria

- [ ] Existing valid GitHub dummy profile returns `valid`
- [ ] Unknown profile returns `missing`
- [ ] Existing profile without a live probe returns `present_unverified`
- [ ] Wrong target domain returns `domain_mismatch`
- [ ] Missing expected authenticated text returns `expired_or_logged_out`
- [ ] Browser/runtime failure returns `runtime_error`
- [ ] `ensure` prints local-only refresh guidance
- [ ] `ensure` does not auto-start public noVNC
- [ ] No secret values are printed
- [ ] `.runtime/` remains ignored
- [ ] Relevant docs and `llm-index.yaml` are updated
- [ ] Main branch is clean after operator pulls and tests

## Later work

### Optional OAuth

OAuth is not required for target-website session reuse. Consider it only if a production-style authentication layer is needed in front of the MCP tools.

- [ ] Protected-resource metadata
- [ ] Authorization-server metadata
- [ ] Token validation model
- [ ] Scope and access policy

### Portfolio polish

- [ ] Architecture diagram image
- [ ] More screenshots
- [ ] Short demo video or GIF
- [ ] Recruiter walkthrough script
- [ ] Resume bullet points
- [ ] LinkedIn project summary

### Automated smoke tests

- [ ] API health smoke test
- [ ] MCP HTTP health smoke test
- [ ] Static scan smoke test
- [ ] Safe local profile-status tests
- [ ] Safe local demo profile-probe tests

## Parking lot

These items are intentionally not prioritized now:

- [ ] Heavy background scheduling
- [ ] Automatic credential entry
- [ ] Password-manager integration
- [ ] Multi-user authentication
- [ ] Mobile app packaging
- [ ] Large general-purpose agent framework migration
- [ ] Termux distribution migration without a specific troubleshooting reason
