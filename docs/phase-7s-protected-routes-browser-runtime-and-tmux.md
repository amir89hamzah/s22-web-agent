# Phase 7S — Protected Routes, Browser Runtime Continuity, and Stable OpenAI Tunnel

## Status

PASS on the Samsung S22 runtime.

Phase 7S extends Phase 7R with protected-route validation, bearer-token proof, safe navigation, browser-page recovery, automatic local browser-runtime startup, real LinkedIn use, and a tmux-held OpenAI tunnel-client.

## Tool boundary

Normal MCP HTTP still exposes exactly eight intended tools: five Job Radar tools and three unified browser tools. All fifteen legacy browser/login/auth tools remain hidden.

## 7S-1 — Bearer-token proof

Commit: `34e3487`.

Validated:

- unauthenticated request returned HTTP 401
- authenticated MCP connection succeeded
- exactly eight intended tools were exposed
- all fifteen legacy tools remained hidden
- persistent Chromium, PNG screenshot, handoff, completion, and cleanup succeeded

## 7S-2 — Protected Route A proof

The eight-tool interface passed through the protected Cloudflare Route A endpoint. Route A and OpenAI Secure MCP Tunnel remain separate modes and must not run together.

## LinkedIn continuity

The local profile `linkedin-job-search` was reused successfully. LinkedIn Jobs opened with HTTP 200, no login wall was detected, and real read-only profile review and job searching succeeded. No Apply, Submit, Save, Dismiss, form entry, or message action occurred.

Credentials, cookies, MFA values, tokens, and storageState contents were not printed and remain outside Git.

## 7S-3 — Safe navigation, page recovery, and auto-bootstrap

Commit: `2bbdfb2`.

`browser_task_run` now supports safe HTTP/HTTPS `navigate`. Embedded URL credentials are rejected.

The persistent browser engine tracks newly opened pages and attempts to recover another live page from `context.pages()` if the active page closes.

When `browser_task_run` starts and worker port `3002` is unavailable, `scripts/ensure-browser-runtime.sh` checks local VNC `5901`, starts stable VNC only when required, starts the stable worker, waits for health, and continues the browser task.

Cold-runtime live proof passed: VNC, worker, Chromium, the saved LinkedIn profile, HTTP 200, and the read-only boundary all worked.

## 7S-4 — Stable OpenAI tunnel-client in tmux

Commit: `18b9502`.

Commands:

```bash
npm run openai:tunnel:client:start:stable
npm run openai:tunnel:client:status:stable
npm run openai:tunnel:client:stop:stable
```

The tunnel-client runs in tmux session `s22openai`. The runtime key is entered manually through a hidden prompt and is not saved in the repository.

Live proof passed after detaching from tmux and closing SSH: ChatGPT still reached the S22, opened Example Domain with HTTP 200, and worker, VNC, and Chromium remained active.

## Operator workflow

See `docs/operator-quickstart.md`.

## Remaining work

- connect browser-control handoff to the approved temporary protected public noVNC gateway
- return the approved noVNC URL after intentional startup
- run a dedicated closed-original-tab recovery regression
- complete a controlled authenticated iLoginHR read-only verification
- exercise all five Job Radar tools through the refreshed intended client path

Public noVNC must remain temporary and intentionally started.
