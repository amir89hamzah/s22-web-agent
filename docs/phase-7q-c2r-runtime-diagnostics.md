# Phase 7Q-C2R — Runtime Doctor and Diagnostic Watcher

## Status

Implemented in the repository. Live S22 validation is pending.

This recovery step was added after the first live Phase 7Q-C2 public login proof reached `waiting_for_user_login`, then Android/Termux ended the main runtime with signal 9 while Chromium, VNC, websockify, proot, and manual-login child processes remained partially alive.

## Objective

Provide low-overhead, secret-safe runtime evidence before repeating the public login proof.

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

## Live S22 validation

Run while Route A, VNC, noVNC, and manual-login Chromium are stopped:

```bash
cd ~/projects/mobile-job-radar-agent

git pull --ff-only

git log -1 --oneline

bash -n \
  scripts/runtime-doctor.sh \
  scripts/runtime-watch-loop.sh \
  scripts/runtime-watch-start.sh \
  scripts/runtime-watch-status.sh \
  scripts/runtime-watch-stop.sh

npm run runtime:doctor

npm run runtime:watch:start

sleep 12

npm run runtime:watch:status

npm run runtime:watch:stop

git status --short
```

Expected:

- doctor completes without a secret or full command line
- watcher starts in tmux
- at least two periodic samples appear
- watcher stops cleanly
- diagnostic log remains under `.runtime/diagnostics/`
- Git working tree remains clean

## Next step

After this diagnostic layer passes on S22, add and validate a light public login mode that omits API port 3001, uses lower VNC geometry/depth, starts the diagnostic watcher before Chromium, and performs stale gateway recovery before another Phase 7Q-C2 live proof.
