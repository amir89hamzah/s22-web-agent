# Why This Project Is Custom-Built

This document explains why S22 Web Agent is built as a custom Android-hosted MCP/browser automation node instead of starting from a general-purpose agent framework.

The short answer is:

> S22 Web Agent is not trying to become a full personal AI agent platform. It is intentionally scoped as a mobile-hosted MCP tool server and browser automation proof.

## Project Positioning

S22 Web Agent is a portfolio and learning project that explores whether an unused Android phone can become a useful AI automation node.

Its core idea is:

```text
Android phone
  -> Termux
  -> Debian proot
  -> Node.js MCP server
  -> Playwright browser worker
  -> SQLite local persistence
  -> controlled tunnel access
```

The project is not positioned as a replacement for larger frameworks such as OpenClaw, Codex, OpenCode, or other general AI agent platforms.

Instead, it focuses on one narrower question:

> Can a phone be repurposed into a controlled, low-cost MCP/browser automation endpoint that an AI assistant can call safely?

## Why Not Start From a General Agent Framework?

General-purpose agent frameworks are useful, but they solve a wider problem than this project needs.

A framework such as OpenClaw is designed to act as a broad personal agent runtime. It may support channels, providers, plugins, browser control, shell execution, file access, policy layers, and multiple integrations.

That is powerful, but it also brings extra complexity:

- larger dependency footprint
- more moving parts
- heavier install size
- native module compatibility risks
- update breakage risk
- framework-specific abstractions
- features that are not needed for this project

On Android, these trade-offs become more serious because Termux and proot are already constrained environments.

If the main goal were to build a general personal assistant, using an existing agent framework would make more sense.

For this project, the main goal is different. The aim is to understand and demonstrate the lower-level automation stack directly.

## Why Android Makes This Harder

Android is not a normal Linux server.

Important constraints include:

- background process limits
- battery optimization
- no standard systemd service manager
- restricted low-level OS access
- no Docker path without root or heavy workarounds
- native dependency differences
- proot performance and compatibility limitations
- browser automation complexity

Because of these constraints, using a large framework on Android may turn the project into a framework-porting exercise rather than an automation architecture project.

That is not the goal of S22 Web Agent.

## Why the Custom Approach Is Still Valid

The custom approach keeps the runtime small and explainable.

Each layer has a clear reason to exist:

| Layer | Reason |
|---|---|
| Termux | Provides the Android userland development environment |
| Debian proot | Provides Linux compatibility for Playwright/Chromium |
| Node.js | Runs the API, MCP server, and automation logic |
| Express | Provides local HTTP API routes |
| SQLite | Provides lightweight local persistence |
| MCP | Provides a standard tool interface for AI clients |
| Playwright | Provides browser-rendered inspection and automation |
| VNC/noVNC | Supports manual login/session capture when needed |
| Tunnel | Provides controlled remote access without exposing all local services |

This makes the project easier to explain in a portfolio setting.

The value is not only that it works. The value is that the boundary is visible:

```text
AI client
  -> MCP endpoint only
  -> local API stays private
  -> browser worker stays private
  -> tokens are kept out of the repository
```

## Security Boundary

The project intentionally avoids giving the AI assistant unrestricted access to the phone.

The preferred pattern is:

```text
ChatGPT / MCP client
  -> approved MCP tools
  -> local S22 services
  -> controlled action
```

The AI should not receive raw passwords, browser cookies, storage state files, tunnel tokens, or device secrets.

For login-dependent browsing, the preferred pattern is manual login by the user, followed by session reuse by automation.

This is closer to an operator-supervised automation node than an unconstrained autonomous agent.

## What This Project Demonstrates

S22 Web Agent demonstrates practical knowledge of:

- MCP server design
- local API design
- browser automation with Playwright
- Android/Termux engineering constraints
- Debian proot usage
- SQLite persistence
- secure tunnel design
- token handling
- manual login/session capture strategy
- port exposure boundaries
- operator runbooks
- incremental Git-based development

These are useful applied AI automation engineering skills.

## Honest Limitations

This project is not production-grade in the same way as a managed server deployment.

Known limitations:

- Android may kill background processes.
- Long-running uptime needs operator discipline.
- Termux/proot is not the same as a normal Linux server.
- Browser automation on mobile-hosted Linux has compatibility risk.
- Performance is limited by phone hardware and thermal behavior.
- Remote exposure must remain tightly controlled.
- The project is not a full agent platform with rich channels, plugin marketplaces, RBAC, or enterprise policy management.

These limitations are accepted because the project is primarily a learning and portfolio proof.

## When a Framework Would Be Better

A general agent framework would be a better fit if the goal were:

- a full personal assistant
- WhatsApp/Telegram/Slack channel support
- multi-user agent access
- large plugin ecosystem
- broad file/browser/shell automation on a PC or VPS
- enterprise-grade policy and approval flows
- fast feature coverage over low-level learning

In those cases, a framework can reduce build time.

S22 Web Agent is intentionally not competing in that space.

## Future Direction

The clean future direction is not to replace S22 Web Agent with a general framework.

A better architecture is:

```text
ChatGPT / Codex / OpenClaw / other agent
  -> MCP
  -> S22 Web Agent
  -> Android-hosted browser automation tools
```

In this model, larger agent frameworks can act as controllers, while S22 Web Agent remains the custom mobile execution node.

That keeps the project identity clear.

## Final Position

S22 Web Agent is custom-built because its purpose is to learn, demonstrate, and control the full path from AI tool call to browser automation on constrained mobile hardware.

Using a ready-made agent framework on Android may be possible, but it risks shifting the project into workaround-heavy framework deployment.

The custom approach is smaller, more explainable, and better aligned with the portfolio message:

> Repurposing an Android phone into a secure, self-hosted MCP browser automation node.
