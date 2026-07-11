# Phase 7Q-A and 7Q-B — Live S22 Results

## Status

```text
Phase 7Q-A: PASS
Phase 7Q-B: PASS
```

Test device: Samsung Galaxy S22 running the project through Termux and Debian proot.

Test profile: `github-manual-local`

Authenticated target: `https://github.com/settings/profile`

Authenticated marker: `Public profile`

## Phase 7Q-A result

The direct authenticated-task lifecycle passed on the S22:

```text
prepare -> ready
status  -> ready
resume  -> ready
```

Verified behavior:

- the saved GitHub dummy profile passed a live headless Chromium probe
- `approvalRequired` was `false`
- `publicGatewayStarted` was `false`
- status read the saved task record without launching a new probe
- resume performed a new live probe and updated the task timestamp
- no VNC, noVNC, Cloudflare tunnel, or public route started
- no password, cookie, token, MFA code, or storageState value was printed
- the Git working tree remained clean

Known harmless runtime output:

```text
proot warning: can't sanitize binding "/proc/self/fd/0"
proot warning: can't sanitize binding "/proc/self/fd/1"
proot warning: can't sanitize binding "/proc/self/fd/2"
```

The warnings did not prevent Chromium from loading the authenticated page. The probe exit code was `0` and the authenticated marker was found.

## Phase 7Q-B result

The MCP authenticated-task integration passed through a local-only stateful Streamable HTTP MCP server:

```text
MCP bind: 127.0.0.1:3003
MCP auth: disabled for local-only proof
public tunnel: not started
```

All four MCP tools were listed and called successfully:

```text
browser_authenticated_task_prepare
browser_authenticated_task_status
browser_authenticated_task_resume
browser_authenticated_task_cancel
```

Lifecycle result:

```text
prepare -> ready
status  -> ready
resume  -> ready
cancel  -> cancelled
```

Verified behavior:

- local MCP HTTP health was reachable
- all four authenticated-task tools appeared in `tools/list`
- prepare returned `ready`
- status returned the saved `ready` state
- resume re-verified the real saved profile
- cancel closed the lifecycle metadata
- the MCP HTTP server was stopped after the proof
- no VNC, noVNC, Cloudflare tunnel, or public route started
- no credential or storageState value was used or printed
- the Git working tree remained clean

## Next phase

```text
Phase 7Q-C0 — Cloudflare security preflight
```

Before any future public noVNC orchestration:

- replace the historical Cloudflare tunnel token
- confirm the separate login hostname
- confirm an exact-email Cloudflare Access Allow policy
- keep the connector, VNC, and noVNC stopped during preflight
- run `npm run auth:gateway:cloudflare:preflight -- s22login.aidesk.rest`
