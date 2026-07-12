# Android Phantom Process Runtime Result

## Status

Operational result: **PASS in the demonstrated S22 configuration**.

This document records the Android runtime issue that previously caused the S22 Web Agent full stack to terminate with signal 9, and the configuration under which the full public-login stack later ran successfully.

## Why this matters

S22 Web Agent runs several cooperating processes on Android:

```text
Termux
  -> Node.js API and MCP services
  -> cloudflared or OpenAI tunnel client
  -> Debian proot
  -> Playwright and Chromium
  -> TigerVNC
  -> noVNC/websockify
  -> tmux and SSH operator sessions
```

This is not a normal Linux server environment. Android may terminate background or child processes even when normal Linux memory indicators do not show an out-of-memory condition.

The problem was therefore important to the project architecture, not a minor terminal inconvenience.

## Failure pattern before the change

During repeated full-stack public-login trials:

- the main runtime was terminated with signal 9
- failures appeared around approximately 35 to 36 visible monitored processes
- Chromium, VNC, websockify, proot, or manual-login child processes could remain partially alive afterward
- `MemAvailable` was still approximately 3 GiB during observed failures
- the failure did not resemble a straightforward Linux RAM exhaustion event

The combination strongly suggested Android phantom-process management as a material factor.

The runtime diagnostics layer was added to collect secret-safe evidence:

```bash
npm run runtime:doctor
npm run runtime:watch:start
npm run runtime:watch:status
npm run runtime:watch:stop
```

The watcher recorded memory, swap, pressure, and process counts without printing full command lines, tokens, credentials, or session artifacts.

## Operator-level change

The Android phantom-process limit was raised to:

```text
256
```

This was applied through ADB as an Android operator-level configuration.

The repository does not apply, require, or silently modify this Android setting. It cannot be enforced by the Node.js code and may vary by Android or One UI version.

The operator also used:

- one primary SSH session
- tmux to hold Route A and long-running processes
- Termux wake lock during the proof
- RAM Plus configured to 8 GB on the demonstrated device

RAM Plus and wake lock are treated as supporting operational settings, not as isolated proof of the root cause.

## Successful full-stack result

After the phantom-process limit was raised to 256, the following stack ran together during the controlled proof:

```text
Cloudflare shared connector
MCP HTTP
local API
Debian proot
Playwright Chromium
TigerVNC
noVNC/websockify
manual-login worker
SSH and tmux control path
runtime watcher
```

Observed full-stack process counts included approximately:

```text
cloudflared: 1
chromium: 11
proot: 4
Xtigervnc: 1
websockify: 2
node: 7
sshd: 5
```

At the same time:

- available memory remained in the multi-gigabyte range
- swap was in use but not exhausted
- no signal 9 occurred
- the protected public noVNC page remained usable
- the human user completed the website login
- the local authenticated profile was captured
- the authenticated task later resumed to `ready`
- the tunnel was stopped cleanly after the proof

## Interpretation

The result provides **strong operational evidence** that Android phantom-process management was a significant cause of the earlier signal-9 failures.

It is not presented as a perfectly isolated laboratory proof because more than one operating condition changed between the failing and successful runs:

- phantom-process limit increased to 256
- the operator simplified control to one SSH session plus tmux
- wake lock and the established runtime procedure were used

Therefore the accurate conclusion is:

> Raising the phantom-process limit to 256, together with the controlled SSH/tmux operating procedure, produced a stable full-stack S22 Web Agent proof where the previous configuration repeatedly failed with signal 9.

## Current operational guidance

For the demonstrated Samsung S22 configuration:

1. Keep the Android phantom-process limit at 256 when running the full browser-login stack.
2. Use one primary SSH session where practical.
3. Hold long-running services in tmux.
4. Use `termux-wake-lock` during an active proof or controlled job.
5. Use `runtime:doctor` for a one-time snapshot.
6. Use `runtime:watch` only when history is needed.
7. Do not interpret tmux as protection from Android terminating the Termux process group.
8. Stop unneeded tunnels, Chromium, VNC, and noVNC after the job.

## Safety and portability boundary

This Android setting:

- is outside the Git repository
- may reset after OS updates or device maintenance
- may behave differently on another Android device or firmware version
- does not make the S22 equivalent to a managed Linux server
- does not remove thermal, battery, background-policy, or proot limitations

The project must continue to report Android runtime constraints honestly.

## Known cleanup limitation

A small orphan `websockify`/proot pair may remain after some noVNC shutdown paths.

This is tracked as a known cleanup limitation. It did not block the authenticated workflow proof and is not treated as the cause of the earlier signal-9 failures.

## Related documentation

```text
docs/phase-7q-c2r-runtime-diagnostics.md
README.md
```

## Portfolio significance

This result demonstrates troubleshooting across application and operating-system boundaries:

- differentiating Android process policy from ordinary RAM exhaustion
- adding secret-safe diagnostics
- using controlled ADB configuration
- validating a complete MCP, tunnel, browser, VNC, and human-login workflow
- documenting uncertainty instead of overstating root-cause certainty

That constrained-device runtime work is a core part of the S22 Web Agent engineering proof.
