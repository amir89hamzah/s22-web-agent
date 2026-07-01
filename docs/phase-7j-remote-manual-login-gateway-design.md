# Phase 7J — Remote Manual Login Gateway Design

Status: Design / Discussion  
Execution: Not started  
Public tunnel used: No  
Raw VNC exposed: No

## Purpose

Phase 7J defines the future remote manual login design for the S22 Web Agent.

The final desired operator experience is:

```text
Assistant/agent gives the user a temporary login link
↓
User opens the link from the internet
↓
User sees the remote browser login page
↓
User logs in manually
↓
User tells the assistant/agent: "I have logged in"
↓
Agent completes the manual login job
↓
S22 saves storageState locally
↓
Agent can run authenticated scans safely
```

This phase is documentation and safety design only. It does not start any public tunnel.

## Background

Phase 7I proved the local-only version of the same pattern:

```text
aVNC local on S22
↓
manual login
↓
browser_complete_manual_login signal
↓
storageState saved locally
↓
direct profile scan PASS
↓
local MCP browser_scan_with_profile PASS
```

The key learning from Phase 7I is that the login credential should remain fully manual and human-controlled.

The assistant/MCP should not receive:

- password
- cookie
- token
- storageState JSON
- localStorage/sessionStorage values

Instead, the user manually logs in and then sends a completion signal.

## noVNC as Adapter / Converter

Raw VNC is not ideal to expose directly to the internet.

Current local VNC shape:

```text
aVNC app on S22
↓
127.0.0.1:5901
↓
TigerVNC inside Debian proot
↓
Chromium login page
```

Future remote gateway shape:

```text
User web browser
↓
HTTPS temporary login link
↓
noVNC web page
↓
local VNC 5901
↓
TigerVNC inside Debian proot
↓
Chromium login page
```

In this design, noVNC acts as an adapter/converter:

```text
VNC protocol
→ noVNC
→ browser-based HTTPS page
```

The raw VNC port `5901` should remain local-only and should not be exposed directly to the internet.

## Two Different Public Routes

There are two different kinds of routes.

### 1. MCP Public Route

Purpose: agent/tool commands.

Example:

```text
ChatGPT / MCP client
↓
public MCP endpoint
↓
S22 MCP HTTP :3003
↓
MCP tools
```

Typical actions:

- health check
- start manual login job
- complete manual login job
- scan with local profile
- list saved pages

### 2. noVNC Login Route

Purpose: human manual login.

Example:

```text
User browser
↓
temporary noVNC HTTPS link
↓
local VNC desktop/browser
↓
login page
```

Typical action:

- user manually logs in

These routes should be treated as separate concerns:

```text
MCP route = for agent commands
noVNC route = for human login
```

## Cloudflare Tunnel vs OpenAI Secure MCP Tunnel

The project currently has two tunnel concepts:

```text
Tunnel A = Cloudflare Named Tunnel / Route A
Tunnel B = OpenAI Secure MCP Tunnel
```

### Cloudflare Named Tunnel / Route A

Cloudflare is suitable for this design because it can serve normal HTTPS routes.

Possible future usage:

```text
https://s22agent.aidesk.rest/mcp       → local MCP HTTP :3003
https://login.s22agent.aidesk.rest     → local noVNC gateway
```

Benefits:

- one public ingress provider
- one DNS/security policy area
- easier to reason about during testing
- can serve a normal browser page for noVNC
- already proven in earlier Route A tests
- good for portfolio explanation

### OpenAI Secure MCP Tunnel

OpenAI Secure MCP Tunnel is useful for ChatGPT Custom App to reach the local MCP server.

But it is not the best fit for the human login page because the login page is a browser/noVNC UI, not just MCP tool traffic.

For this reason, OpenAI tunnel is not deleted or rejected. It is parked for a later phase.

Current design decision:

```text
Use Cloudflare for Phase 7J remote manual login gateway design.
Park OpenAI tunnel for a later review.
```

Possible later phase:

```text
Phase 7K / later:
Review whether OpenAI Secure MCP Tunnel should be used only for MCP command traffic,
while Cloudflare/noVNC handles human login.
```

## Proposed Future Flow

```text
1. User asks assistant/agent to scan a page that needs login.

2. Agent checks whether a valid local profile exists.

3. If no valid profile exists, agent starts a manual login job.

4. S22 starts:
   - Debian proot VNC
   - Chromium headed browser
   - noVNC gateway
   - temporary HTTPS tunnel/link

5. Agent gives the user the temporary noVNC login link.

6. User opens the link and logs in manually.

7. User returns to chat and says:
   "I have logged in."

8. Agent calls:
   browser_complete_manual_login

9. S22 saves storageState locally.

10. noVNC login link is stopped.

11. Agent runs:
   browser_scan_with_profile
```

## Safety Gates

The remote manual login gateway must follow these gates:

### Gate 1 — No raw VNC public exposure

Raw VNC port `5901` must remain local-only.

### Gate 2 — noVNC must be temporary

The noVNC link should be started only when a manual login job is pending.

It should stop after:

- login completed
- login cancelled
- timeout reached

### Gate 3 — noVNC must not be the MCP endpoint

The human login route and MCP command route should be separate.

### Gate 4 — Manual login only

The system must not ask the user to paste passwords, cookies, tokens, or storageState.

### Gate 5 — Completion signal required

The system saves storageState only after the user explicitly confirms login completion.

### Gate 6 — storageState local only

storageState remains in `.runtime/sessions/<profile>/`.

It must not be printed, committed, uploaded, or sent through MCP arguments.

### Gate 7 — Authenticated scan output suppressed

Authenticated scan output should use:

```bash
SESSION_SCAN_SUPPRESS_EXCERPT=1
```

### Gate 8 — Profile/domain allowlist

A captured profile should only be valid for its allowed domains.

Example:

```text
github-login-demo-2 → github.com only
```

### Gate 9 — Public MCP requires authentication

If MCP is exposed publicly, MCP auth must be enabled.

No-token public access should return unauthorized.

### Gate 10 — Operator approval before public test

The operator must explicitly approve any public remote login gateway test.

## Non-goals for Phase 7J

Phase 7J does not:

- start Cloudflare tunnel
- start OpenAI tunnel
- expose raw VNC
- expose noVNC
- expose MCP publicly
- perform real personal-account login
- perform public authenticated profile scan
- print any cookie/session/token/password/storageState values

## Future Implementation Phases

Suggested roadmap:

```text
Phase 7J:
Remote Manual Login Gateway design and safety gates.

Phase 7K:
Local noVNC gateway test.
Browser on local network/device opens noVNC, but no internet exposure yet.

Phase 7L:
Temporary protected Cloudflare noVNC link proof.
Short-lived login link, closed after completion/cancel/timeout.

Phase 7M:
Full agent continuity.
Agent gives login link, user logs in, user confirms, agent completes login, profile scan runs safely.
```

## Design Decision

For the next implementation direction:

```text
Use Cloudflare Route A for the future remote noVNC login gateway.
Keep OpenAI Secure MCP Tunnel parked for later MCP-only review.
Do not mix noVNC login gateway and authenticated MCP scan until safety gates are implemented.
```

## Current Status

This document captures the agreed design direction after Phase 7I.

No public execution was performed in Phase 7J design.
