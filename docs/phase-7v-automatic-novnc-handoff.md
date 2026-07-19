# Phase 7V — Automatic Protected On-Demand noVNC Handoff

Status: PASS on Samsung S22.

## Goal

Allow ChatGPT to request temporary human control of the same persistent
Chromium session without requiring the operator to manually start local noVNC,
manually start the Cloudflare connector, or manually provide a tunnel token.

The intended lifecycle is:

```text
npm run s22:start
    |
    +-- API, MCP, and OpenAI tunnel ready
    +-- browser runtime remains lazy

ChatGPT starts browser work
    |
    +-- persistent Chromium starts automatically when required

browser_task_handoff request
    |
    +-- preserve the same Chromium session
    +-- start local noVNC automatically
    +-- start protected Cloudflare connector automatically
    +-- return the public browser-control URL

human controls the same Chromium through noVNC

browser_task_handoff complete
    |
    +-- stop protected Cloudflare connector
    +-- stop local noVNC
    +-- preserve Chromium and the browser task
    +-- return control to the agent
```

## Implementation

Phase 7V integrates the browser-control gateway lifecycle into:

```text
tools/browser-task-orchestrator.mjs
```

For a `browser_control` handoff request, the orchestrator now:

1. starts the existing persistent-browser handoff;
2. starts local noVNC;
3. starts the temporary protected Cloudflare connector;
4. returns the configured public browser-control URL.

If public tunnel startup fails after local noVNC has started, the orchestrator
attempts rollback by stopping local noVNC and completing the worker handoff
without saving the profile.

For handoff completion, the orchestrator:

1. stops the protected public tunnel;
2. stops local noVNC;
3. completes the worker handoff;
4. keeps the persistent Chromium session alive.

The default public URL is:

```text
https://s22login.aidesk.rest/vnc.html?host=s22login.aidesk.rest&port=443&autoconnect=1&resize=scale
```

It may be overridden through:

```text
S22_PUBLIC_NOVNC_URL
```

The earlier root URL:

```text
https://s22login.aidesk.rest
```

only exposed the noVNC directory listing and is not the operator handoff URL.

## Stored Cloudflare token

Normal automatic operation reads the Cloudflare tunnel token from:

```text
~/.config/s22-web-agent/cloudflare-tunnel-token
```

The tunnel-start helper now supports:

- the stored S22 secret file for normal operation;
- an explicit `CLOUDFLARE_TUNNEL_TOKEN` environment override;
- a hidden interactive prompt for intentional manual runs.

A non-interactive start fails clearly if no token is available.

The token is removed from the parent environment before the tmux tunnel session
is created so it does not unnecessarily propagate into the tmux environment.

The start helper is also idempotent when the expected Cloudflare tmux session
already exists and verifies that the session survives initial startup before
reporting success.

The stop helper removes temporary runtime token material together with the
existing temporary environment and runner files.

## Browser engine action boundary

Phase 7V removes the Phase 7R hardcoded action-permission filter from:

```text
tools/proot-playwright-worker/persistent-browser-engine.mjs
```

The browser engine no longer rejects controls based on hardcoded action text
such as:

```text
submit
save
apply
approve
reject
delete
remove
confirm
send
pay
purchase
checkout
book
login
logout
```

It also no longer rejects a click solely because:

- the element is an `input`, `select`, or `textarea`;
- the control has `type="submit"`.

The persistent browser engine is therefore treated as the browser actuator
rather than the component responsible for deciding whether a user-visible
action is permitted.

Technical security boundaries remain separate from action permission. Secret
session values, cookies, tokens, passwords, field values, and storageState
contents are not returned through browser-task metadata.

## Static checks

The four Phase 7V modified files passed syntax checks:

```text
tools/browser-task-orchestrator.mjs
tools/proot-playwright-worker/persistent-browser-engine.mjs
scripts/session-novnc-public-temp-tunnel-start.sh
scripts/session-novnc-public-temp-tunnel-stop.sh
```

Checks used Node syntax validation for the JavaScript modules and Bash syntax
validation for the shell scripts.

## Final regression proof

The final regression began from the operator lifecycle command:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:start
```

No separate manual noVNC or Cloudflare startup command was used.

A persistent browser task was started through the OpenAI MCP connection.

Before handoff:

```text
Chromium:     running
cloudflared:  0
```

A `browser_task_handoff` request with `type=browser_control` then demonstrated:

- the same persistent Chromium remained alive;
- local noVNC was made available automatically;
- the Cloudflare connector started automatically;
- `cloudflared` process count changed from 0 to 2;
- the full `/vnc.html?...` browser-control URL was returned;
- the operator successfully opened that URL;
- the Chromium page was visible and controllable through public noVNC.

The initial regression attempt returned the old root URL because the MCP and
API processes had already been running before the code change and therefore
still held the previous orchestrator code in memory.

A full:

```text
npm run s22:stop
npm run s22:start
```

loaded the current Phase 7V code, after which the correct full browser-control
URL was returned.

This confirmed that the URL patch itself was correct and that the earlier
result came from stale running application code rather than a failed patch.

## Handoff completion proof

After human interaction, `browser_task_handoff action=complete` demonstrated:

```text
browser handoff: inactive
cloudflared:     0
Chromium:        still running
browser task:    still running
```

A separate post-handoff socket check confirmed:

```text
PASS: port 6080 is not listening
```

Therefore the temporary public browser-control path and local noVNC listener
were closed after handoff while the persistent Chromium session remained
available to the agent.

## Consequential action regression

A safe test page was used to create a temporary `Delete` button during the
human noVNC handoff.

After returning control to the agent:

1. the browser snapshot exposed the `Delete` control;
2. the agent clicked the control through `browser_task_run`;
3. the click succeeded;
4. the `Delete` control disappeared from the subsequent snapshot;
5. no Phase 7R consequential-action policy error was raised.

This confirms that a non-payment consequential action such as `Delete` is no
longer blocked by the S22 persistent browser engine.

The regression did not require a real payment or purchase action.

## Exposure result

Final verified post-handoff state:

```text
Cloudflare public connector: off
local noVNC port 6080:       not listening
persistent Chromium:         running
persistent browser task:     running
```

The normal OpenAI MCP path remained separate from the temporary public noVNC
browser-control path.

## Known parked observation

Stopping local noVNC can leave stale or orphan-looking proot/websockify
processes visible in process-count diagnostics even after the actual noVNC
listener and public Cloudflare path are closed.

For Phase 7V acceptance, the relevant exposure checks were:

```text
cloudflared = 0
port 6080 not listening
```

The orphan/stale process investigation is intentionally parked and is not a
Phase 7V blocker.

An SSH client connection also disconnected once during the test sequence.
The `s22:stop` diagnostics still showed SSHD processes present, so there is no
evidence that the unified S22 stop command intentionally stops SSHD. This is
recorded as an observation only and was not pursued within Phase 7V.

## Result

Phase 7V Automatic Protected On-Demand noVNC Handoff: PASS.

The operator and agent boundary is now:

```text
operator:
npm run s22:start

agent:
start browser work
request browser-control handoff

system:
start local noVNC
start protected Cloudflare connector
return approved full noVNC URL

human:
temporarily control the same Chromium session

agent:
complete handoff

system:
stop Cloudflare connector
stop local noVNC
preserve Chromium session
resume agent browser work
```

The public browser-control gateway is now on-demand rather than part of the
normal always-on S22 runtime.
