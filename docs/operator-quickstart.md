# S22 Web Agent — Operator Quick Start

## One-time setup

Store the required runtime secrets outside the Git repository:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:secrets:setup
```

Enter secrets only at the hidden terminal prompts.

Do not paste API keys, Cloudflare tunnel tokens, passwords, cookies, MFA
values, or storageState contents into chat, documentation, screenshots, or Git.

## Start S22

From a normal Termux or SSH shell:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:start
```

Wait for:

```text
PASS: S22 Web Agent READY
```

No separate Debian login, tmux attach, API start, MCP start, VNC start, or
Playwright worker start is required for normal operation.

The browser worker, VNC, and Chromium remain lazy and start automatically when
a browser task needs them.

## Ask ChatGPT to do work

Select `S22 Web Agent OpenAI` and request the required task.

Example:

```text
Use S22 Web Agent OpenAI. Start a read-only browser task using profile
linkedin-job-search. Do not Apply, Submit, Save, Dismiss, fill forms, or send
messages.
```

## Check status

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:status
```

A healthy core runtime reports:

```text
Overall: READY
API 3001: ready
MCP 3003: ready
OpenAI tmux: running
Tunnel process: running
```

Browser worker, VNC, noVNC, and public tunnel may correctly report `off` while
no browser work or human handoff is active.

## Stop S22

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:stop
```

A complete shutdown ends with:

```text
Overall: STOPPED
PASS: S22 Web Agent fully stopped.
```

## Human browser handoff

When temporary human control of the persistent Chromium session is required,
ChatGPT can request a `browser_control` handoff.

The Phase 7V handoff lifecycle automatically:

1. starts local noVNC;
2. starts the temporary protected Cloudflare connector;
3. returns the full public noVNC browser-control URL;
4. preserves the same persistent Chromium session.

After human interaction is complete, ChatGPT completes the handoff. The public
Cloudflare connector and local noVNC are then stopped automatically while the
persistent Chromium session remains available for continued agent work.

No manual noVNC start, Cloudflare tunnel start, or Cloudflare token entry is
required during normal operation.

## More documentation

For individual service start, status, stop, and troubleshooting commands:

```text
docs/manual-service-commands.md
```

For manual fresh-device cloning and setup guidance:

```text
docs/installation-and-setup.md
```

## Security boundaries

- API port 3001 remains local-only.
- Playwright worker port 3002 remains local-only.
- MCP port 3003 remains local-only behind the intentional OpenAI tunnel path.
- Raw VNC port 5901 remains local-only.
- noVNC port 6080 remains local-only by default.
- Public noVNC is temporary and used only for intentional human handoff.
- The OpenAI MCP tunnel and public noVNC Cloudflare connector may coexist
  because they serve separate control paths.
- Do not start the old Route A public MCP exposure as an alternative to the
  intended OpenAI MCP tunnel during normal operation.
- Never expose or print runtime secrets.
