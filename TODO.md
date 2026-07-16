# S22 Web Agent — Engineering Roadmap

This file tracks the current engineering state of the Samsung S22-hosted MCP and browser-automation project.

## Current checkpoint

Latest completed runtime proof:

```text
Phase 7S — protected routes, safe navigation, browser auto-bootstrap,
and SSH-independent OpenAI tunnel: PASS
```

The normal MCP HTTP server still exposes exactly eight intended tools.

Phase 7S confirmed bearer-token and protected-route access, safe navigation, local VNC and worker auto-bootstrap, real LinkedIn profile continuity, and an OpenAI tunnel-client that remains reachable after SSH disconnect.

Current next step:

```text
Integrate browser-control handoff with the approved temporary protected
noVNC path without auto-starting a public gateway as a fallback.
```

Still pending:

- protected public noVNC browser-control handoff
- automatic return of the approved noVNC gateway URL
- dedicated closed-tab recovery regression
- controlled authenticated iLoginHR read-only verification
- exercise all five Job Radar tools through the refreshed intended client path

## Phase 7P-0 — Documentation reconciliation

Status: COMPLETE.

- [x] Review repository state from commit `ab2e2e8`
- [x] Reconcile `README.md`
- [x] Reconcile `TODO.md`
- [x] Reconcile `llm-index.yaml`
- [x] Document Phase 7O-E long-gap continuity
- [x] Preserve existing port and secret boundaries

## Completed core capabilities

- [x] CLI and HTTP scanner
- [x] SQLite persistence and Markdown reports
- [x] MCP stdio
- [x] MCP Streamable HTTP on port `3003`
- [x] Local API on port `3001`
- [x] Debian proot Playwright worker on port `3002`
- [x] Route A Cloudflare public MCP proof
- [x] OpenAI Secure MCP Tunnel proof
- [x] Manual login through VNC
- [x] Stable tmux-held VNC
- [x] Local noVNC
- [x] Temporary Cloudflare Access protected public noVNC proof
- [x] Playwright `storageState` capture
- [x] Named profiles and domain allowlists
- [x] MCP `browser_scan_with_profile`
- [x] Real GitHub dummy-account authenticated scan
- [x] Repeated profile reuse without noVNC
- [x] Long-gap profile reuse after S22 restart
- [x] Persistent visible Chromium worker on VNC display `:1`
- [x] Unified persistent browser-task orchestrator
- [x] Exactly eight intended tools on normal MCP HTTP
- [x] MCP PNG screenshot delivery from the task runtime directory
- [x] Clarification handoff that preserves the persistent Chromium session
- [x] Unified MCP HTTP proof and clean runtime shutdown

## Mandatory security rules

- [x] Never request or print passwords
- [x] Never request or print cookies
- [x] Never request or print session tokens
- [x] Never request or print MFA codes
- [x] Never print or paste `storageState.json` contents
- [x] Keep `.runtime/` out of Git
- [x] Keep API port `3001` local-only
- [x] Keep Playwright worker port `3002` local-only
- [x] Keep raw VNC port `5901` local-only
- [x] Keep noVNC `6080` local-only by default
- [x] Expose MCP `3003` only through an intentional protected route
- [x] Keep public noVNC temporary and intentionally started
- [x] Never auto-start public noVNC as a fallback
- [x] Never perform automatic credential entry
- [x] Keep tunnel and MCP tokens out of Git
- [x] Do not echo supplied URLs in Phase 7P refresh guidance
- [ ] Rotate the historical Cloudflare tunnel token before another public test
- [x] Do not upgrade npm major solely because an update notice appears
- [x] Do not propose Termux F-Droid migration by default

## Session gateway phase history

| Phase | Status | Result |
|---|---|---|
| 7A | Complete | User-controlled session gateway design |
| 7B | Deferred | Cookie JSON import parked |
| 7C | PASS | VNC, session capture, local reuse |
| 7D | PASS | Profile-aware headless scan |
| 7E | PASS | Proof guard hardening |
| 7F | PASS | MCP profile scan integration |
| 7G | Complete | Pre-login security cleanup |
| 7H | PASS | Real GitHub dummy login and scan |
| 7I | PASS | Stable VNC and repeated verification |
| 7J | Complete | Remote login gateway design |
| 7K | PASS | Local noVNC proof |
| 7L | Complete | Public HTTPS noVNC design |
| 7M | PASS | Local noVNC-assisted manual login |
| 7N | PASS | Protected temporary public noVNC demo proof |
| 7O | PASS | Saved-profile continuity |
| 7O-E | PASS | Full restart and approximately one week offline |
| 7P | Implemented | Profile lifecycle helper foundation |
| 7Q | PASS | Authenticated-task lifecycle, protected login gateway, and runtime diagnostics |
| 7R | PASS | Unified persistent browser tools on normal MCP HTTP |
| 7S | PASS | Protected routes, safe navigation, auto-bootstrap, LinkedIn continuity, and stable OpenAI tunnel |

## Phase 7P — Profile lifecycle helpers

Goal:

Distinguish local profile presence from actual remote website session validity.

Required states:

```text
missing
present_unverified
valid
expired_or_logged_out
domain_mismatch
runtime_error
```

Stable exit codes:

```text
present_unverified      0
valid                   0
missing                20
expired_or_logged_out  21
domain_mismatch        22
runtime_error          23
```

### 7P-1 — `session:profile:status`

Implementation: ADDED.

- [x] Validate safe profile name
- [x] Inspect profile artifacts without Chromium
- [x] Parse `storageState.json` and `metadata.json` safely
- [x] Detect missing artifacts
- [x] Read domain allowlist
- [x] Optionally validate target URL host
- [x] Return `present_unverified` for healthy local artifacts
- [x] Reject URLs with embedded credentials
- [x] Remove query strings, fragments, and user information from displayed URLs
- [x] Never print storageState contents

### 7P-2 — `session:profile:probe`

Implementation: ADDED.

- [x] Run inside Debian proot
- [x] Launch headless Chromium
- [x] Require profile, authenticated URL, and expected text
- [x] Return `valid` when marker is found
- [x] Return `expired_or_logged_out` when page loads without marker
- [x] Return `domain_mismatch` before browser launch
- [x] Return `runtime_error` on browser, network, JSON, or runtime failure
- [x] Suppress page text excerpt by design
- [x] Never print cookie/session/storageState values

### 7P-3 — `session:profile:ensure`

Implementation: ADDED.

- [x] Run local status first
- [x] Run live probe only for a usable local profile
- [x] Return success only for `valid`
- [x] Print local manual-login refresh guidance for missing/expired profiles
- [x] Print URL placeholders instead of supplied URLs
- [x] Never auto-start VNC
- [x] Never auto-start noVNC
- [x] Never auto-start Cloudflare
- [x] Never auto-start a public route
- [x] Never enter credentials automatically

### 7P-4 — Self-test

Implementation: ADDED.

- [x] Add disposable local classifier test
- [x] Cover `missing`
- [x] Cover `present_unverified`
- [x] Cover `domain_mismatch`
- [x] Cover `runtime_error`
- [x] Avoid touching real profiles
- [x] Static JavaScript syntax checks passed outside S22
- [x] Shell syntax checks passed outside S22
- [x] Local classifier behavior test passed outside S22

Command:

```bash
npm run session:profile:self-test
```

### Phase 7P historical note

Phase 7P created the profile lifecycle foundation used by the later authenticated-task work.

The old pending operator checklist is no longer the current roadmap checkpoint. Detailed Phase 7P implementation and proof notes remain in:

```text
docs/phase-7p-profile-lifecycle-helpers.md
```

## Phase 7R — Unified Persistent Browser MCP Integration

Status: PASS on the local Samsung S22 runtime.

Implemented:

- [x] Register `browser_task_run` on normal MCP HTTP
- [x] Register `browser_task_handoff` on normal MCP HTTP
- [x] Register `browser_task_status` on normal MCP HTTP
- [x] Keep exactly five Job Radar tools plus three unified browser tools
- [x] Hide all fifteen legacy browser/login/auth tools from normal MCP HTTP
- [x] Preserve legacy source and stdio diagnostic registration
- [x] Return validated screenshots as MCP `image/png` content
- [x] Remove internal screenshot paths from MCP text output
- [x] Reject screenshot symlinks and paths outside the expected task directory
- [x] Preserve one Chromium session across snapshots and clarification handoff
- [x] Complete and stop the persistent browser task cleanly
- [x] Stop MCP HTTP, worker, VNC, and tmux runtime cleanly
- [x] Avoid credentials, cookies, tokens, MFA values, form values, and storageState contents

Local proof command:

```bash
npm run mcp:browser-task:proof
```

Detailed result:

```text
docs/phase-7r-unified-persistent-browser-mcp.md
```

Remaining follow-up:

- [ ] Verify non-loopback MCP startup with mandatory bearer token
- [ ] Verify the new eight-tool set through an intentional protected route
- [ ] Prove browser-control handoff through the approved noVNC path
- [ ] Run a real iLoginHR read-only task
- [ ] Decide whether VNC and worker startup should remain manual or become approval-gated
- [ ] Exercise the five Job Radar tools through the same intended client path

## Phase 7S — Protected routes and runtime continuity

Status: PASS on the Samsung S22 runtime.

Implemented and validated:

- [x] Bearer-token and protected-route proofs
- [x] Safe HTTP/HTTPS `navigate`
- [x] Page tracking and recovery logic
- [x] Automatic local VNC and worker startup
- [x] Saved `linkedin-job-search` profile reuse
- [x] Real read-only LinkedIn profile review and job search
- [x] Stable tmux-held OpenAI tunnel-client
- [x] ChatGPT reachability after SSH disconnect

Operator guide:

```text
docs/operator-quickstart.md
```

Detailed result:

```text
docs/phase-7s-protected-routes-browser-runtime-and-tmux.md
```

Remaining follow-up:

- [ ] Protected temporary noVNC browser-control handoff
- [ ] Automatic return of the noVNC URL
- [ ] Dedicated closed-tab recovery regression
- [ ] Controlled authenticated iLoginHR read-only verification
- [ ] Exercise all five Job Radar tools through the refreshed intended client path

## Deferred and later work

### Cookie JSON import

Status: DEFERRED.

Playwright `storageState` captured through a user-controlled browser remains the preferred path.

### Optional OAuth

OAuth protects access to MCP tools; it is separate from logging into target websites.

- [ ] Implement only if production-style MCP authentication is required

### Portfolio polish

- [ ] Architecture diagram image
- [ ] More screenshots
- [ ] Short demo video or GIF
- [ ] Recruiter walkthrough
- [ ] Resume bullet points
- [ ] LinkedIn project summary

### Automated smoke tests

- [ ] API health smoke test
- [ ] MCP HTTP smoke test
- [x] Unified persistent-browser MCP HTTP proof
- [ ] Static scan smoke test
- [ ] Phase 7P local profile-state smoke tests
- [ ] Local demo authenticated probe test

## Parking lot

- [ ] Heavy background scheduling
- [ ] Password-manager integration
- [ ] Multi-user authentication
- [ ] Mobile application packaging
- [ ] General-purpose agent framework migration
- [ ] Termux distribution migration without a specific troubleshooting reason
