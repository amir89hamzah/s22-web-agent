# Phase 7Q-B — MCP Authenticated Task Integration

## Status

Implemented in the repository. Live S22 MCP verification is pending.

Phase 7Q-A already proved the authenticated-task lifecycle directly on the S22:

```text
prepare -> ready
status  -> ready
resume  -> ready
cancel  -> available
```

Phase 7Q-B exposes that lifecycle to both MCP transports used by this repository:

- stdio MCP
- stateful Streamable HTTP MCP

## Objective

Allow ChatGPT or another MCP client to call the S22 lifecycle instead of requiring the operator to type the lifecycle commands directly in Termux.

The intended behavior is:

```text
ChatGPT calls prepare
  -> saved profile is valid
      -> state: ready
      -> ChatGPT may continue the browser task

  -> saved profile is missing or expired
      -> state: login_required
      -> approvalRequired: true
      -> ChatGPT asks the user for approval
      -> no public gateway starts in Phase 7Q-B
```

## MCP tools added

```text
browser_authenticated_task_prepare
browser_authenticated_task_status
browser_authenticated_task_resume
browser_authenticated_task_cancel
```

### `browser_authenticated_task_prepare`

Inputs:

- safe job name
- named local profile
- authenticated target URL
- non-secret expected authenticated marker
- optional login URL

Possible lifecycle results include:

- `ready`
- `login_required`
- `domain_mismatch`
- `runtime_error`

This tool may run a headless Chromium profile probe. It never starts VNC, noVNC, Cloudflare, or a public route.

### `browser_authenticated_task_status`

Reads the saved lifecycle record from `.runtime/authenticated-tasks/`.

It does not launch Chromium.

### `browser_authenticated_task_resume`

Runs the live authenticated profile probe again and updates the saved task state.

It is intended for use after a delay or after a future human login refresh.

### `browser_authenticated_task_cancel`

Marks the lifecycle metadata as cancelled.

It does not start or stop unrelated browser, VNC, noVNC, or tunnel services.

## Implementation files

```text
src/mcp-auth-task-tools.mjs
src/mcp-server.mjs
src/mcp-http-server.mjs
tools/mcp-auth-task-http-proof.mjs
package.json
```

The Phase 7Q-B tools are implemented in a separate module instead of expanding `src/mcp-core.mjs`. Both MCP entrypoints register the same module.

## Safety boundary

The MCP tools do not accept:

- password
- cookie
- session token
- MFA code
- storageState JSON or storageState path
- Cloudflare tunnel token
- full user prompt

The MCP tools do not start:

- VNC
- noVNC
- Cloudflare Tunnel
- a public route

A `login_required` result is only a request for the next layer to ask the user for explicit approval.

## Cloudflare requirement

No Cloudflare action is required for Phase 7Q-B.

Do not start Route A, the temporary public noVNC connector, or the noVNC public hostname for this test.

Cloudflare becomes relevant only in Phase 7Q-C. Before that phase:

- rotate or recreate the historical Cloudflare tunnel token that appeared in early raw logs
- confirm Cloudflare Access protection for the login hostname
- keep the token local to the S22 operator shell
- never send the token through MCP or ChatGPT

## Local S22 proof command

The proof uses the existing GitHub dummy profile and a local-only MCP HTTP listener.

```bash
cd ~/projects/mobile-job-radar-agent

git pull --ff-only

git log -1 --oneline

node --check src/mcp-auth-task-tools.mjs
node --check src/mcp-server.mjs
node --check src/mcp-http-server.mjs
node --check tools/mcp-auth-task-http-proof.mjs

npm run mcp:http:stop 2>/dev/null || true

MCP_HTTP_HOST=127.0.0.1 MCP_HTTP_TOKEN= npm run mcp:http:start

npm run mcp:http:status

npm run mcp:auth-task:proof -- \
  mcp-github-profile-check \
  github-manual-local \
  https://github.com/settings/profile \
  "Public profile" \
  https://github.com/login

npm run mcp:http:stop

git status --short
```

The proof client must verify:

```text
PASS: connected to local MCP HTTP endpoint
PASS: all four authenticated-task MCP tools listed
PASS: prepare returned ready
PASS: status returned ready
PASS: resume returned ready
PASS: cancel returned cancelled
PASS: no public gateway started
```

## Expected runtime behavior

The valid GitHub dummy profile should produce:

```text
prepare -> ready
status  -> ready
resume  -> ready
cancel  -> cancelled
```

The `prepare` and `resume` calls may take several seconds because each performs a live headless Chromium probe inside Debian proot.

The local proof may show the known harmless proot file-descriptor warnings inside the sanitized probe summary. They are not a failure when the lifecycle exit code is `0` and the authenticated marker is found.

## Acceptance decision

Do not mark Phase 7Q-B fully PASS until the S22 proof confirms:

- syntax checks pass
- the local MCP HTTP server starts on `127.0.0.1:3003`
- all four tools appear in `tools/list`
- all four tools are called successfully
- the valid GitHub dummy profile reaches `ready`
- the lifecycle ends in `cancelled`
- no VNC, noVNC, Cloudflare, or public route starts
- no secret value is printed
- the Git working tree remains clean
