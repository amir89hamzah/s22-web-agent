# Phase 7Q — Human-in-the-Loop Authenticated Task Orchestrator

## Status

Phase 7Q-A implemented. Live S22 verification is pending.

Phase 7Q-A adds a reuse-first authenticated-task lifecycle before the lifecycle is exposed as MCP tools in Phase 7Q-B.

## Objective

The final user experience is:

```text
User gives ChatGPT a browser task
  -> ChatGPT asks S22 to prepare the authenticated task
  -> S22 checks the named profile
  -> valid profile: continue the task
  -> missing/expired profile: request explicit user approval
  -> after approval, provide a temporary protected login route
  -> user logs in manually
  -> S22 saves the refreshed profile
  -> temporary login services stop
  -> ChatGPT resumes the original task
```

Phase 7Q-A implements the task lifecycle and approval boundary. It does not yet start a public login route and is not yet exposed through MCP.

## Commands

```bash
npm run auth:task:prepare -- <job> <profile> <target-url> "<expected-text>" [login-url]
npm run auth:task:status -- <job>
npm run auth:task:resume -- <job>
npm run auth:task:cancel -- <job>
```

Example using the existing GitHub dummy profile:

```bash
npm run auth:task:prepare -- \
  github-profile-check \
  github-manual-local \
  https://github.com/settings/profile \
  "Public profile" \
  https://github.com/login
```

Expected valid state:

```text
state: ready
ok: true
approvalRequired: false
publicGatewayStarted: false
```

## Lifecycle states

```text
checking_profile
ready
login_required
domain_mismatch
runtime_error
cancelled
```

### `ready`

The saved profile passed a live authenticated probe. The caller can continue the requested browser task using that profile.

### `login_required`

The profile is missing or the authenticated marker was not found.

This state does not start VNC, noVNC, Cloudflare, or a public route. The next layer must ask the user for explicit approval.

### `domain_mismatch`

The named profile is not allowlisted for the requested target domain. The orchestrator blocks the task instead of opening a login gateway for the wrong profile/domain pair.

### `runtime_error`

The live probe could not determine profile validity because of a local runtime, browser, network, or file error.

### `cancelled`

The task lifecycle is closed. Cancelling task metadata does not stop or start unrelated services.

## Runtime storage

Task records are stored only under:

```text
.runtime/authenticated-tasks/<job>.json
```

Git ignores `.runtime/`.

The task record stores only orchestration metadata:

- safe job name
- named profile
- target URL
- expected authenticated marker
- optional login URL
- state and timestamps
- sanitized probe summary

It does not store:

- the user's full prompt
- password
- cookies
- session token
- MFA code
- storageState JSON content
- Cloudflare tunnel token

## Safety behavior

Phase 7Q-A preserves these rules:

- Never accept or print passwords, cookies, session tokens, MFA codes, or storageState JSON.
- Never accept an arbitrary storageState path.
- Validate safe job and profile names.
- Reject URLs containing embedded username/password credentials.
- Remove query strings and fragments from URLs shown in public output.
- Keep task files under `.runtime/` only.
- Keep API port `3001` local-only.
- Keep Playwright worker port `3002` local-only.
- Keep raw VNC `5901` local-only.
- Never auto-start public noVNC.
- Never request the Cloudflare tunnel token through ChatGPT.
- Require explicit user approval before Phase 7Q-C may start a temporary login gateway.

## Why Phase 7Q is divided

### Phase 7Q-A — lifecycle foundation

Implemented:

- prepare authenticated task
- check live profile validity
- represent `ready` or `login_required`
- store resumable task metadata
- resume after a future login refresh
- cancel task metadata
- no public gateway start

### Phase 7Q-B — MCP integration

Next:

- expose prepare/status/resume/cancel as MCP tools
- return structured lifecycle output to ChatGPT
- keep login gateway start unavailable until explicit approval is represented

### Phase 7Q-C — temporary login gateway after approval

Later, only after Cloudflare token rotation and a safe S22 test:

- user explicitly approves login gateway start
- local VNC/noVNC starts
- temporary protected Cloudflare connector starts
- ChatGPT receives the protected noVNC URL
- user logs in manually
- profile capture completes
- gateway, noVNC, and VNC stop
- authenticated task resumes

## Important Cloudflare note

The earlier Cloudflare tunnel token appeared in raw logs before helper hardening. Rotate or recreate that token before Phase 7Q-C public testing.

The MCP layer must never request or receive this token.

## Phase 7Q-A S22 verification

After pulling the latest repository:

```bash
cd ~/projects/mobile-job-radar-agent
git pull --ff-only
git log -1 --oneline

node --check tools/authenticated-task-orchestrator.mjs
bash -n scripts/auth-task-prepare.sh
bash -n scripts/auth-task-status.sh
bash -n scripts/auth-task-resume.sh
bash -n scripts/auth-task-cancel.sh

npm run auth:task:prepare -- \
  github-profile-check \
  github-manual-local \
  https://github.com/settings/profile \
  "Public profile" \
  https://github.com/login

npm run auth:task:status -- github-profile-check
npm run auth:task:resume -- github-profile-check
git status --short
```

Expected for the currently valid GitHub dummy profile:

```text
state: ready
approvalRequired: false
publicGatewayStarted: false
```

The live test must not start VNC, noVNC, Cloudflare, or any public route.

## Acceptance decision

Do not mark Phase 7Q-A fully PASS until the lifecycle commands are run on the S22 with the real `github-manual-local` dummy profile and the working tree remains clean.
