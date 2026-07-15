# Phase 7R — Unified Persistent Browser MCP Integration

## Status

Implemented and live-validated locally on the Samsung S22.

This phase connects the persistent browser-task orchestrator to the normal stateful MCP Streamable HTTP server.

## Objective

Expose one small, task-first browser interface to ChatGPT and other MCP clients:

```text
ChatGPT or MCP client
  -> MCP HTTP port 3003
  -> three unified browser tools
  -> browser-task-orchestrator.mjs
  -> local Playwright worker port 3002
  -> persistent visible Chromium on VNC display :1
```

The MCP adapter remains thin. Browser lifecycle, task state, worker calls, handoff logic, device health, and safety rules remain inside the orchestrator.

## Normal MCP HTTP tool set

The normal MCP HTTP server now exposes exactly eight tools.

### Job Radar tools

```text
job_radar_health
job_radar_list_pages
job_radar_get_page
job_radar_scan
job_radar_get_report
```

### Unified browser tools

```text
browser_task_run
browser_task_handoff
browser_task_status
```

## Unified browser tools

### `browser_task_run`

Supported actions:

```text
start
snapshot
click
scroll
back
reload
complete
cancel
```

It supports one active persistent browser task at a time.

A task keeps the same Chromium browser, context, and page until it is completed or cancelled.

### `browser_task_handoff`

Supported handoff types:

```text
clarification
browser_control
```

Clarification handoff remains in chat.

Browser-control handoff is designed to preserve the same persistent Chromium while the user temporarily controls it through the approved noVNC path.

The Phase 7R MCP proof directly tested clarification request and completion. It did not open a public noVNC route.

### `browser_task_status`

Returns:

- saved task metadata
- persistent worker state
- current device health
- current screenshot when available

It does not start Chromium or another runtime service.

## Legacy tools

The fifteen earlier browser, authenticated-task, and login-gateway MCP tools remain in the repository for diagnosis and regression.

They are no longer registered on the normal MCP HTTP path.

The legacy stdio entrypoint continues to register the earlier tools for local diagnostic use.

No legacy source file was deleted.

## Screenshot delivery

The browser worker stores the latest viewport screenshot locally under the task runtime directory.

The MCP adapter:

1. validates the safe job name
2. accepts only the expected `last-page.png` path
3. rejects symlinks and files outside the task directory
4. enforces a screenshot size limit
5. checks the PNG signature
6. reads the file internally
7. returns it as MCP image content

MCP image format:

```text
type: image
mimeType: image/png
data: base64 PNG
```

The adapter removes `screenshotPath` from MCP text output.

The `.runtime` directory is not exposed as a public HTTP directory.

## Safety boundary

The unified MCP tools do not request or return:

- passwords
- Company Code
- User ID
- cookies
- session tokens
- MFA values
- field values
- storageState contents

URLs stored in task metadata are sanitized.

Only read-only browser actions are currently supported.

No form filling or Submit action is exposed.

## Implementation files

```text
src/mcp-browser-task-tools.mjs
src/mcp-core.mjs
src/mcp-http-server.mjs
tools/mcp-unified-browser-http-proof.mjs
package.json
```

Existing orchestrator:

```text
tools/browser-task-orchestrator.mjs
```

## Local live proof

Runtime was started manually in this order:

```text
stable VNC
stable Playwright worker
local-only MCP HTTP
```

The proof command was:

```bash
npm run mcp:browser-task:proof
```

The strengthened proof passed:

```text
PASS: connected to MCP HTTP
PASS: exactly 8 intended MCP HTTP tools are exposed
PASS: all 15 legacy browser/login/auth tools are hidden
PASS: browser task opened Example Domain with HTTP 200
PASS: start returned a valid MCP PNG image
PASS: snapshot used the same persistent browser session
PASS: clarification handoff request and completion preserved the session
PASS: browser_task_status returned the active job and MCP PNG image
PASS: task completed
PASS: final status showed completed task and inactive browser session
```

The screenshot size observed during the proof was:

```text
17117 PNG bytes
```

## Runtime cleanup proof

Cleanup passed:

```text
MCP HTTP port 3003 stopped
MCP parent and child processes stopped
MCP PID file removed
Playwright worker port 3002 stopped
tmux s22worker removed
VNC port 5901 stopped
tmux s22vnc removed
```

No orphan MCP, worker, or VNC process was detected.

## Network boundary

The first Phase 7R proof used:

```text
MCP_HTTP_HOST=127.0.0.1
```

This was a controlled local proof only.

The project may continue to support:

```text
0.0.0.0 + mandatory MCP_HTTP_TOKEN
```

for trusted LAN clients and future non-OpenAI MCP clients.

A non-loopback Phase 7R proof was not performed in this phase.

## Not proved in this phase

Phase 7R did not yet prove:

- trusted-LAN access through `0.0.0.0`
- bearer-token MCP client proof for the new eight-tool set
- public Cloudflare or OpenAI tunnel access to the new eight-tool set
- MCP browser-control handoff through protected noVNC
- a real iLoginHR read-only task
- automatic startup of VNC or worker
- Job Radar API calls through port 3001

## Acceptance result

Phase 7R local integration is accepted as PASS.

The next work should verify the intentional protected route and then perform a controlled real read-only browser task without exposing credentials or enabling form submission.
