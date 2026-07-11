# S22 Web Agent — Engineering Roadmap

This file tracks the current engineering state of the Samsung S22-hosted MCP and browser-automation project.

## Current checkpoint

Latest completed runtime proof:

```text
Phase 7O-E — long-gap session continuity: PASS
```

The GitHub dummy profile `github-manual-local` survived a full S22 power-off/restart and approximately one week offline. It was reused headlessly without VNC/noVNC and without another login.

Current phase:

```text
Phase 7P — operator-quality profile lifecycle helpers
```

Current Phase 7P status:

```text
Implementation added
Static and local classifier checks passed
Live S22 Debian/Chromium verification pending
```

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
| 7P | Implemented | Live S22 verification pending |

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

### Phase 7P live S22 verification

Pending operator commands:

```bash
cd ~/projects/mobile-job-radar-agent
git pull --ff-only
npm run session:profile:self-test
npm run session:profile:status -- github-manual-local https://github.com/settings/profile
npm run session:profile:probe -- github-manual-local https://github.com/settings/profile "Public profile"
npm run session:profile:ensure -- github-manual-local https://github.com/settings/profile "Public profile" https://github.com/login
git status --short
```

Expected while the GitHub dummy session remains authenticated:

```text
self-test -> PASS
status    -> present_unverified
probe     -> valid
ensure    -> valid
git status --short -> no output
```

Acceptance criteria still pending:

- [ ] Self-test passes in Termux on S22
- [ ] Existing GitHub profile status returns `present_unverified`
- [ ] Live GitHub probe returns `valid`
- [ ] GitHub ensure returns `valid`
- [ ] Unknown profile returns `missing`
- [ ] Wrong target domain returns `domain_mismatch`
- [ ] No secret values are printed
- [ ] VNC/noVNC/public tunnel remain off
- [ ] Working tree remains clean
- [ ] Mark Phase 7P fully PASS only after these checks

Proof and operator notes:

```text
docs/phase-7p-profile-lifecycle-helpers.md
```

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
