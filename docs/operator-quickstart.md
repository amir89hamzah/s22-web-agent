# S22 Web Agent — Operator Quick Start

## Before asking ChatGPT to do browser work

Run from a normal Termux or SSH shell:

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:start
npm run openai:tunnel:client:start:stable
```

The second command opens or attaches to tmux session `s22openai`.

1. Enter the OpenAI runtime API key at the hidden prompt.
2. Wait until the tunnel connects.
3. Detach with `Ctrl+b`, release the keys, then press `d`.
4. The SSH session may then be closed.

For a normal browser task, do not start VNC or the Playwright worker manually. `browser_task_run` with `action=start` auto-starts both when required.

## Ask ChatGPT to do work

Select `S22 Web Agent OpenAI` and ask for a read-only task.

Example:

```text
Use S22 Web Agent OpenAI. Start a read-only browser task using profile linkedin-job-search. Do not Apply, Submit, Save, Dismiss, fill forms, or send messages.
```

## Check status

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:client:status:stable
npm run openai:tunnel:status
npm run worker:status:stable
npm run session:vnc:status
```

## Stop all services

```bash
cd ~/projects/mobile-job-radar-agent
npm run openai:tunnel:client:stop:stable
npm run openai:tunnel:stop
npm run worker:stop:stable
npm run session:vnc:stop:stable
```

## Security boundaries

- Do not run Route A and OpenAI Secure MCP Tunnel together.
- API `3001`, worker `3002`, MCP `3003`, and raw VNC `5901` remain local-only in OpenAI tunnel mode.
- Public noVNC is not started automatically.
- Never paste passwords, cookies, MFA values, storageState contents, or runtime keys into chat or Git.
