# Phase 7Q-C2R — Runtime Doctor and Diagnostic Watcher

## Status

Implemented and live-validated on the Samsung S22.

This recovery step was added after the first live Phase 7Q-C2 public-login proof reached `waiting_for_user_login`, then Android/Termux ended the main runtime with signal 9 while Chromium, VNC, websockify, proot, and manual-login child processes remained partially alive.

The diagnostics later helped show that the observed failures did not look like straightforward Linux RAM exhaustion. During failing runs, visible process counts were around 35 to 36 while `MemAvailable` was still approximately 3 GiB.

After the Android phantom-process limit was raised to 256 and the operator used one primary SSH session plus tmux, the complete public-login stack ran without signal 9. The protected noVNC page remained usable, the human login completed, and the authenticated task later resumed to `ready`.

Detailed result:

```text
docs/android-phantom-process-runtime-result.md
```

## Objective

Provide low-overhead, secret-safe runtime evidence before and during a public-login proof.

The diagnostic tools must:

- show current RAM, available memory, swap use, and visible memory pressure
- count key S22 Web Agent processes
- identify stale service PID files
- list top visible executables by resident memory
- record periodic snapshots to `.runtime/diagnostics/`
- avoid full command lines because a `cloudflared` command line may contain tunnel token material
- avoid environment values, passwords, cookies, MCP tokens, Cloudflare tokens, MFA values, and storageState contents

## Commands

```bash
npm run runtime:doctor
npm run runtime:watch:start
npm run runtime:watch:status
npm run runtime:watch:stop
```

Default watcher interval:

```text
5 seconds
```

Optional controlled interval:

```bash
RUNTIME_WATCH_INTERVAL=10 npm run runtime:watch:start
```

Allowed interval range is 2 to 60 seconds.

## Files

```text
scripts/runtime-doctor.sh
scripts/runtime-watch-loop.sh
scripts/runtime-watch-start.sh
scripts/runtime-watch-status.sh
scripts/runtime-watch-stop.sh
```

Watcher log:

```text
.runtime/diagnostics/runtime-watch.log
```

Previous logs are retained with timestamped names when a new watcher starts. The active log rotates at approximately 2 MiB by default.

## Doctor output

The one-time doctor prints:

- `free -h`
- selected `/proc/meminfo` fields
- `/proc/pressure/memory` when readable
- process counts for cloudflared, Chromium, proot, TigerVNC, websockify, Node, and sshd
- known API and MCP PID-file state
- tmux session names
- top visible processes by RSS using PID, PPID, state, RSS, and executable name only
- repository filesystem usage

It deliberately does not print process arguments or environment values.

## Watcher behavior

The watcher runs inside the tmux session:

```text
s22-runtime-watch
```

Each sample records:

- ISO timestamp
- total and available memory
- total and used swap
- memory pressure when readable
- key process counts
- top ten visible executables by resident memory

If SSH disconnects but Termux remains alive, tmux keeps the watcher running. If Android kills the Termux process group, the log should still retain samples written before termination.

## Safety boundary

Do not use diagnostic cleanup commands that delete:

```text
.runtime/sessions/
```

That directory contains saved authenticated profiles.

Do not use broad commands such as:

```text
pkill -f node
pkill -f proot
rm -rf .runtime
```

Recovery should target known jobs and processes only.

## Live S22 validation result

Repository and runtime validation passed:

- `runtime:doctor` completed without printing secrets or full command lines
- the watcher started in tmux
- periodic samples were written under `.runtime/diagnostics/`
- the watcher stopped cleanly
- the working tree remained clean
- memory and process evidence was available before and during the repeated public-login proof

During the later successful full-stack run, the watcher observed approximately:

```text
cloudflared: 1
chromium: 11
proot: 4
Xtigervnc: 1
websockify: 2
node: 7
sshd: 5
```

Available memory remained in the multi-gigabyte range and no signal 9 occurred.

The demonstrated operator configuration included:

```text
Android phantom-process limit: 256
RAM Plus: 8 GB
Termux wake lock: active during proof
control path: one primary SSH session plus tmux
```

The Android phantom-process setting is outside the repository and cannot be enforced by the application code.

## Interpretation boundary

The successful result strongly supports Android phantom-process management as a significant factor in the earlier failures.

It is not treated as a perfectly isolated root-cause proof because the SSH/tmux operating procedure also changed between the failing and successful runs.

The accurate project claim is:

> Raising the phantom-process limit to 256, together with the controlled one-SSH-plus-tmux operating procedure, enabled the demonstrated full S22 Web Agent stack to run without the previous signal-9 failure.

## Operational use

Use `runtime:doctor` when a current snapshot is enough.

Use `runtime:watch` when time-series evidence is needed for a heavy proof or intermittent Android termination.

The watcher is diagnostic support, not a permanent requirement for every normal S22 Web Agent task.

## Next step

The diagnostic recovery milestone is complete.

Future work should focus on the task-first, login-on-demand browser workflow and portfolio completion rather than continuing to treat ordinary RAM monitoring as the main blocker.
