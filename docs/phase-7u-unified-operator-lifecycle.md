# Phase 7U — Unified Operator Lifecycle

Status: PASS on Samsung S22.

## Goal

Reduce normal S22 Web Agent operation to one operator start command and one
operator stop command while preserving the existing secure OpenAI MCP path and
lazy browser-runtime bootstrap.

Normal lifecycle:

```text
npm run s22:start
    |
    +-- local API 3001
    +-- MCP HTTP 3003
    +-- stable OpenAI tunnel-client
    |
    +-- browser worker/VNC/Chromium remain lazy
        and start automatically when browser work is requested

ChatGPT performs work

npm run s22:stop
    |
    +-- public noVNC tunnel, if owned by this runtime
    +-- local noVNC
    +-- active browser task and worker
    +-- VNC and Chromium
    +-- runtime watcher
    +-- OpenAI tunnel-client
    +-- MCP HTTP
    +-- API
```

## Operator commands

One-time secret setup:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:secrets:setup
```

Normal startup:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:start
```

Status:

```bash
npm run s22:status
```

Shutdown:

```bash
npm run s22:stop
```

## Secret handling

Phase 7U stores operator secrets outside the Git repository:

```text
~/.config/s22-web-agent/control-plane-api-key
~/.config/s22-web-agent/cloudflare-tunnel-token
```

The configuration directory is restricted and secret files are stored with
restricted permissions.

Secret values must never be committed, printed in documentation, pasted into
chat, or included in diagnostics.

During final regression testing a Cloudflare tunnel token was found to be
visible through a process command line because an older helper used
`cloudflared tunnel run --token ...` and a diagnostic printed the full process
arguments.

The exposed token was rotated before final acceptance.

The tunnel launcher was then changed so that:

- supported cloudflared versions use a token file;
- the compatibility fallback uses the `TUNNEL_TOKEN` environment variable;
- the token is no longer present in cloudflared process arguments;
- OpenAI runtime diagnostics do not print cloudflared command lines.

A regression check confirmed that the current stored Cloudflare token was not
visible in cloudflared process arguments.

## Startup behaviour

`npm run s22:start`:

1. validates the stored OpenAI runtime secret;
2. optionally acquires the Termux wake lock;
3. starts or reuses the local API on port 3001;
4. starts or reuses local MCP HTTP on port 3003;
5. starts or reuses the stable OpenAI tunnel-client in tmux session `s22openai`;
6. verifies API, MCP, and tunnel readiness;
7. returns control to the Termux shell.

The command is idempotent for the tested READY state.

Browser worker, Chromium, and VNC are intentionally not started by the core
startup command. They remain lazy and are auto-bootstrapped when a browser task
requires them.

## Shutdown behaviour

`npm run s22:stop` performs a unified shutdown of the project-owned runtime.

The final acceptance proof confirmed shutdown of:

- active browser task;
- Playwright worker;
- Chromium and VNC;
- local noVNC;
- project-owned public noVNC tunnel session;
- runtime watcher;
- OpenAI tunnel-client;
- MCP HTTP;
- API.

Final verified state:

```text
Overall:          STOPPED

API 3001:         off
MCP 3003:         off
OpenAI tmux:      off
Tunnel process:   off
Browser worker:   off
VNC 5901:         off
noVNC 6080:       off
Public tunnel:    off
```

The public tunnel stop helper intentionally does not perform a global
`pkill cloudflared`.

## Acceptance proof

Phase 7U was tested through a fresh ChatGPT conversation after starting S22
with only:

```bash
cd ~/projects/mobile-job-radar-agent && npm run s22:start
```

The proof demonstrated:

- ChatGPT could reach S22 through the OpenAI MCP connection;
- `browser_task_status` was usable immediately;
- the normal MCP HTTP surface remained the intended eight tools;
- browser worker, VNC, and Chromium could auto-bootstrap when required;
- saved browser profiles could be reused;
- real read-only browser work could be performed;
- the runtime remained controllable without additional Termux startup commands;
- a final single `npm run s22:stop` returned the complete runtime to STOPPED.

## Cloudflare coexistence regression

Phase 7U originally rejected startup whenever any `cloudflared` process was
already running.

This was incorrect because the OpenAI MCP tunnel and the temporary public
noVNC Cloudflare connector serve different purposes and may legitimately
coexist during a human browser handoff.

The guard was removed.

A regression test confirmed:

```text
OpenAI MCP tunnel: running
Cloudflare public tunnel: running
Overall S22 status: READY
```

without exposing the Cloudflare tunnel token.

## Boundary intentionally left for Phase 7V

Phase 7U does not automatically expose public noVNC.

Current behaviour during a human-control request is:

```text
browser_task_handoff request
    |
    +-- browser session preserved
    +-- VNC available
    +-- local browser-control path available
    |
    +-- public Cloudflare noVNC connector is not automatically started
```

Phase 7V will add an automatic protected on-demand lifecycle:

```text
human help required
→ start local noVNC
→ start protected Cloudflare connector
→ provide approved browser-control URL
→ human completes manual interaction
→ return control to agent
→ stop public connector
→ stop local noVNC when no longer required
→ preserve the browser session
```

## Known follow-up observations

These observations do not block the Phase 7U PASS result:

1. A saved browser task can temporarily retain `running` metadata after its
   worker is no longer reachable. Runtime state should take precedence over
   stale task metadata.
2. Historical runtime diagnostic output may contain old websockify counts and
   must not be interpreted as current process state.
3. Direct browser navigation capability should be reconciled between the
   implemented browser action schema and operator-facing documentation.
4. Automatic protected public noVNC handoff belongs to Phase 7V.
5. Approval-gated agent-controlled delayed full shutdown belongs to Phase 7W.

## Result

Phase 7U Unified Operator Lifecycle: PASS.

The normal operator boundary is now:

```text
one-time:
npm run s22:secrets:setup

normal operation:
npm run s22:start
ChatGPT performs work
npm run s22:status
npm run s22:stop
```
