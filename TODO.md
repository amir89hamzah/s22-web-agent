# S22 Web Agent - Task List

<!-- PHASE7_SESSION_GATEWAY_START -->

## Phase 7 — User-Controlled Session Gateway

Status: Phase 7A design-first.

### Phase 7A — Design doc

- [x] Create `docs/session-gateway-design.md`.
- [x] Cover Option A — Cookie JSON Import via Download folder.
- [x] Cover Option B — Playwright Manual Login via VNC / Session Capture Mode.
- [x] State that OAuth is separate and later.
- [x] Keep default Option B as local VNC on S22.
- [x] Keep noVNC/Cloudflare temporary login link as optional later only with strong access protection.
- [x] Add git ignore rules for runtime session artifacts.

### Phase 7B — Cookie JSON proof

Status: deferred / later.

Reason: user is short on time. Cookie JSON import is useful for a lightweight proof, but the practical direction is Option B / Session Capture Mode because Playwright `storageState` is more reliable than cookie-only import.

Later tasks:

- [ ] Define Download-folder cookie inbox.
- [ ] Validate profile name and domain allowlist.
- [ ] Import cookie JSON into `.runtime/sessions/<profile>/` without logging secrets.
- [ ] Prove cookie/session files never enter git or ChatGPT.

### Phase 7C — Playwright Manual Login via VNC / Session Capture Mode

Status: preferred next practical implementation after design review.

Planned direction:

- [ ] Start temporary visible Chromium/Playwright in Debian proot.
- [ ] Control it through local VNC on S22.
- [ ] User logs in manually.
- [ ] Save `.runtime/sessions/<profile>/storageState.json`.
- [ ] Close GUI/VNC after capture.
- [ ] Future scans run headless using named profile and domain allowlist.

<!-- PHASE7_SESSION_GATEWAY_END -->

This file tracks the current engineering roadmap for the S22 Web Agent portfolio project.

The project started as a mobile job radar scanner and has evolved into a Samsung S22-hosted MCP/web automation agent.

## Current Status

Completed core capabilities:

- [x] Run Node.js project on Samsung S22 through Termux
- [x] Store scanned pages in SQLite
- [x] Generate JSON and Markdown reports
- [x] Provide CLI commands for scan, list, show, delete, report, and help
- [x] Provide HTTP API server on local port `3001`
- [x] Provide MCP stdio server
- [x] Provide MCP Streamable HTTP server on local port `3003`
- [x] Provide browser-rendered inspection through Debian proot Playwright worker on local port `3002`
- [x] Provide Route A public MCP mode through Cloudflare Named Tunnel
- [x] Provide OpenAI Secure MCP Tunnel mode for private ChatGPT Custom App integration
- [x] Add operator helper scripts for Route A
- [x] Add operator helper scripts for OpenAI Secure MCP Tunnel mode
- [x] Document successful Route A live test
- [x] Document successful OpenAI Secure MCP Tunnel test
- [x] Document successful OpenAI Secure MCP Tunnel helper test

## Operating Modes

### Local CLI/API Mode

- [x] CLI scan through `node src/index.js scan <url>`
- [x] Local API health through `GET /health`
- [x] Local API scan through `POST /scan`
- [x] Local page list through `GET /pages`
- [x] Local report read through `GET /report/:id`

### MCP Local Mode

- [x] MCP stdio server
- [x] MCP Streamable HTTP server
- [x] Stateful MCP HTTP sessions
- [x] Optional MCP HTTP bearer token for local/LAN/Route A testing
- [x] Shared MCP tools through `src/mcp-core.mjs`

### Route A Cloudflare Mode

- [x] Cloudflare Named Tunnel setup
- [x] Public hostname: `s22agent.aidesk.rest`
- [x] Public MCP endpoint: `https://s22agent.aidesk.rest/mcp`
- [x] Expose only MCP HTTP port `3003`
- [x] Keep API port `3001` private
- [x] Keep Playwright worker port `3002` private
- [x] Add Route A start/status/stop helpers
- [x] Document Route A operator runbook
- [x] Document Route A live test results

### OpenAI Secure MCP Tunnel Mode

- [x] Connect ChatGPT Custom App through OpenAI Secure MCP Tunnel
- [x] Run `tunnel-client` inside Debian proot
- [x] Keep Termux MCP HTTP on `127.0.0.1:3003/mcp`
- [x] Keep Termux API on `127.0.0.1:3001`
- [x] Keep Cloudflare Route A off in this mode
- [x] Prompt for OpenAI runtime API key instead of storing it in the repo
- [x] Add OpenAI tunnel start/status/stop helpers
- [x] Add Debian tunnel-client helper
- [x] Document OpenAI tunnel operator runbook
- [x] Document OpenAI tunnel helper test results

### Debian Proot Playwright Worker

- [x] Run Chromium/Playwright inside Debian proot
- [x] Expose worker locally on port `3002`
- [x] Add browser inspection MCP tools
- [x] Add worker status and notes helpers
- [x] Document Debian proot Playwright setup

## Security Rules

- [x] Do not expose API port `3001` publicly
- [x] Do not expose Playwright worker port `3002` publicly
- [x] Expose only MCP HTTP port `3003` for Route A public mode
- [x] Keep OpenAI runtime API key out of git
- [x] Keep Cloudflare tunnel token out of git
- [x] Keep MCP HTTP token out of git
- [x] Keep runtime files such as logs, reports, database, and `.runtime/` out of git

## Recently Completed Milestones

- [x] Phase 5 OpenAI Secure MCP Tunnel proof
- [x] Phase 6 OpenAI Secure MCP Tunnel operator helpers
- [x] Phase 6.5 OpenAI tunnel helper test documentation
- [x] README updated with OpenAI Secure MCP Tunnel mode
- [x] Repo audit after Phase 6.5
- [x] Confirmed `server.log` is ignored and not tracked
- [x] Removed temporary repo review artifact

## Next Recommended Phase

## Phase 7 - Cookie/Session Login Workflow

Goal: allow user-controlled login/session handling for websites that require authentication, without giving credentials to ChatGPT and without committing secrets to the repo.

Planned work:

- [ ] Write design doc for cookie/session login workflow
- [ ] Define security rules for browser cookies and session files
- [ ] Decide storage location for local-only session files
- [ ] Add `.gitignore` rules for cookie/session artifacts if needed
- [ ] Define manual login flow using a user-controlled browser
- [ ] Define import/export flow for Playwright context or cookie JSON
- [ ] Test with a safe non-sensitive website first
- [ ] Document what should never be pasted into ChatGPT
- [ ] Keep implementation lightweight to avoid overloading Samsung S22

Out of scope for first Phase 7 pass:

- [ ] Full password manager integration
- [ ] Automatic credential entry
- [ ] Storing usernames/passwords in repo or scripts
- [ ] Heavy background browser automation

## Later Phase - Optional OAuth

OAuth is not required for the current working OpenAI Secure MCP Tunnel mode.

Consider OAuth later only if a production-style ChatGPT App authentication layer is needed.

Possible future work:

- [ ] Add OAuth protected-resource metadata endpoint
- [ ] Add OAuth authorization-server metadata endpoint
- [ ] Decide token validation model
- [ ] Decide scopes and access policy
- [ ] Document difference between local no-auth tunnel mode and production OAuth mode

## Later Phase - Portfolio Polish

- [ ] Add screenshots of Termux runtime
- [ ] Add screenshots of ChatGPT Custom App tool calls
- [ ] Add architecture diagram image
- [ ] Add short demo script for recruiter walkthrough
- [ ] Add resume bullet points
- [ ] Add LinkedIn project summary
- [ ] Add concise "What this demonstrates" section
- [ ] Add limitations and security tradeoffs in simple language

## Later Phase - Automated Smoke Tests

- [ ] Add smoke test for API health
- [ ] Add smoke test for MCP HTTP health
- [ ] Add smoke test for scan `example.com`
- [ ] Add smoke test for Route A when tunnel is running
- [ ] Add smoke test notes for OpenAI Secure MCP Tunnel mode

## Parking Lot

These items are intentionally not prioritized now:

- [ ] Improve scanner scoring rules
- [ ] Add advanced domain typo correction
- [ ] Add heavier browser fallback logic
- [ ] Add background scheduling
- [ ] Add mobile app packaging
- [ ] Add multi-user auth

<!-- PHASE7C1_VNC_HELPERS_START -->

## Phase 7C-1 — Local VNC Baseline Helpers

Status: PASS / ready to commit.

Completed manually before helper patch:

- [x] Installed TigerVNC, Openbox, xterm, and supporting packages inside Debian proot.
- [x] Started local-only TigerVNC on display `:1` / port `5901`.
- [x] Connected from AVNC on S22 to `127.0.0.1:5901`.
- [x] Confirmed Openbox + `xterm` visible.
- [x] Confirmed Chromium visible with `https://example.com`.
- [x] Stopped VNC and cleaned stale Chromium/VNC artifacts.

Helper scripts added:

- [x] `npm run session:vnc:start`
- [x] `npm run session:vnc:status`
- [x] `npm run session:vnc:stop`

Next:

- [ ] Phase 7C-2 / 7C-3: implement Session Capture Mode to save `.runtime/sessions/<profile>/storageState.json`.

<!-- PHASE7C1_VNC_HELPERS_END -->

<!-- PHASE7C2_SESSION_CAPTURE_PROOF_START -->

## Phase 7C-2 — Session Capture Mode Proof

Status: dummy proof PASS.

Added:

- [x] Visible Playwright capture helper.
- [x] `npm run session:capture:example`.
- [x] `npm run session:capture:start`.
- [x] `npm run session:capture:status`.
- [x] Safe profile-name validation.
- [x] Domain allowlist check.
- [x] Save `storageState.json` under `.runtime/sessions/<profile>/`.
- [x] Save metadata without cookie/session values.

First proof target:

- [x] Run with `example-proof` profile and `https://example.com/`.
- [x] Confirm Chromium opens visibly in AVNC.
- [x] Press Enter to save storageState.
- [x] Confirm `.runtime/` artifacts do not appear in git status.
- [x] Stop VNC after proof.

Real website login remains later after dummy proof passes.

<!-- PHASE7C2_SESSION_CAPTURE_PROOF_END -->

<!-- PHASE7C3_LOGIN_REUSE_PROOF_START -->

## Phase 7C-3 — Local Demo Login Capture + Headless Reuse Proof

Status: PASS.

Completed:

- [x] Added local-only demo login server.
- [x] Started demo server at `http://127.0.0.1:3107`.
- [x] Logged in manually through AVNC.
- [x] Captured `local-login-demo` storageState.
- [x] Ran headless reuse against `/secure`.
- [x] Confirmed protected text: `S22 DEMO AUTH PASS`.
- [x] Confirmed `.runtime/` artifacts did not enter git status.
- [x] Stopped VNC and demo server after proof.

Next:

- [ ] Decide whether to test a non-sensitive external website profile.
- [ ] Add profile-aware headless scan integration later.

<!-- PHASE7C3_LOGIN_REUSE_PROOF_END -->

## Phase 7D — Profile-aware Headless Scan Integration
- [x] Add local profile-aware headless scan helper.
- [x] Add Termux wrapper using Debian proot.
- [x] Prove scan using local demo profile before MCP integration.
- [ ] Integrate profile-aware scan into MCP only after helper proof is clean.
- [ ] Real external login scans are deferred until explicitly requested.


## Phase 7E — Proof Guard Hardening
- [x] Add proof guard wrapper for profile-aware scan.
- [x] Add guard-only command to detect empty/truncated helper files.
- [x] Add proof command that fails unless safe PASS output is found.
- [x] Document Phase 7D recovery lesson.
- [ ] Integrate profile-aware scan into MCP only after proof guard remains clean.

## Phase 7F — MCP Profile Scan Integration
- [x] Add MCP tool for profile-aware headless scan.
- [x] Reuse existing session profile helper instead of duplicating storageState logic.
- [x] Keep MCP input limited to profile, URL, and optional expected text.
- [x] Keep storageState path resolution internal to the helper.
- [x] Test MCP tool call through local MCP HTTP.
- [ ] Do not test external real login until explicitly requested.

## Phase 7G — Pre-login Cleanup

Status: planned / in progress.

Goals:

- Document safety boundary before real external login.
- Confirm `browser_scan_with_profile` accepts profile/url/expectedText only.
- Confirm password/cookie/token/storageState values are not accepted through MCP arguments.
- Confirm session/profile artifacts are ignored by Git.
- Re-run local profile scan sanity check.
- Keep public tunnel off until MCP auth is enabled and intentionally started.

Exit criteria:

- `docs/phase-7g-pre-login-cleanup.md` committed.
- `.gitignore` contains session/profile safety rules.
- Local demo profile scan still passes.
- No cookie/session/token/password values are printed.
- Main branch clean and pushed.
- External real login still not tested.

## Phase 7H — Pending Manual Login Job

Status: in progress.

Goals:

- Add MCP pending manual login job flow.
- Add start/status/complete/cancel manual login wrappers.
- Save storageState locally under `.runtime/sessions/<profile>/` only.
- Keep password/cookie/token/storageState out of MCP arguments and logs.
- Suppress authenticated page text excerpts during MCP profile scans.
- Keep public tunnel off during the first real login trial.

Exit criteria:

- `browser_start_manual_login`, `browser_manual_login_status`, `browser_complete_manual_login`, and `browser_cancel_manual_login` appear in MCP tools/list.
- Direct manual login wrapper can create a named profile.
- `browser_scan_with_profile` works with the created profile.
- No cookie/session/token/password/storageState values are printed.
- Main branch clean and pushed.

