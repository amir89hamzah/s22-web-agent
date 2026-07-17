# Phase 7T — Phone-Only Cold Restart and End-to-End Runtime Proof

## Status

PASS for the intended phone-only cold-restart proof on the Samsung S22.

The protected public noVNC handoff trial remains BLOCKED and is recorded separately. It does not invalidate the main Phase 7T result.

## Date

17 July 2026

## Starting checkpoint

```text
Commit: 598d62c — Document Phase 7S and operator workflow
Tag: checkpoint-phase-7s-documented
```

Before restart, the S22 repository was clean and synchronized with GitHub. The OpenAI tunnel-client, MCP HTTP, API, Playwright worker, VNC, and tmux sessions were stopped.

No runtime code was changed during this proof.

## Intended proof scope

The intended test was to prove that the first-version operator path could recover from a full phone restart without a PC or SSH session:

1. fully restart the Samsung S22
2. open Termux directly on the phone
3. start the OpenAI Secure MCP Tunnel runtime
4. keep the tunnel-client alive through tmux
5. allow ChatGPT to reach the S22
6. allow `browser_task_run` to auto-bootstrap the local browser runtime
7. open a real website through the persistent Chromium session

The test did not require public noVNC to pass.

## Result

Validated after the full S22 restart:

- Termux was opened directly on the phone
- the OpenAI Secure MCP Tunnel runtime was started from the phone
- the tunnel-client remained available through tmux
- ChatGPT reached the S22 without a PC or SSH session
- `browser_task_run` automatically started the required local VNC and Playwright worker
- persistent Chromium started successfully
- `https://example.com/` remained available in the browser runtime
- `https://www.iloginhr.com/loginbs.aspx` opened successfully
- the iLoginHR page returned HTTP 200 and displayed the expected login form
- no credentials, cookies, MFA values, tokens, form values, or `storageState` contents were entered or exposed by the agent

Therefore the phone-only cold-restart and main end-to-end runtime path is accepted as PASS.

## Public noVNC handoff trial

A later manual-control trial attempted to expose the existing iLoginHR Chromium session through the temporary protected public noVNC path.

Observed locally:

- VNC was running
- Chromium and the Playwright worker were running
- local noVNC/websockify could be started
- a `cloudflared` process could be started

However, `s22login.aidesk.rest` continued to return Cloudflare Error 1033 and the Cloudflare dashboard still showed the expected tunnel as down.

This trial is classified as:

```text
BLOCKED — likely tunnel-token or Cloudflare tunnel/hostname configuration mismatch
```

It is not classified as a browser-runtime failure because the worker, Chromium, VNC, local noVNC, and target website were all working locally.

The trial also confirmed that public noVNC currently requires several manual commands and does not yet provide the intended automatic handoff workflow.

## Lessons

- The main cold-restart proof should have stopped after the phone-only OpenAI MCP and browser-runtime path passed.
- Public noVNC should be treated as a separate protected-handoff phase.
- The operator should not need to remember multiple runtime commands or enter the same secret on every startup.
- Public noVNC must remain temporary and intentionally started, not enabled by the normal base startup command.
- A process existing is not sufficient proof that a Cloudflare tunnel is connected; the hostname and intended tunnel must also pass a real reachability check.

## Accepted conclusion

```text
Phase 7T — phone-only cold restart and end-to-end runtime proof: PASS
Public protected noVNC handoff: BLOCKED / incomplete
Runtime code changes during proof: none
```

## Next phase

Phase 7U will implement a unified operator lifecycle:

```text
npm run s22:secrets:setup
npm run s22:start
npm run s22:status
npm run s22:stop
```

Design requirements:

- secrets stored once outside the repository with restrictive permissions
- normal startup without repeated token prompts
- no automatic public noVNC startup
- lazy VNC, worker, and Chromium startup when browser work is requested
- non-interactive detached tunnel-client startup
- startup health checks and rollback on partial failure
- deterministic, idempotent, full clean shutdown
- no global process termination where targeted PID or named tmux control is available
