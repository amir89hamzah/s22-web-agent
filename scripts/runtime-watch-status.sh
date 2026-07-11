#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SESSION="${RUNTIME_WATCH_TMUX_SESSION:-s22-runtime-watch}"
LOG_FILE=".runtime/diagnostics/runtime-watch.log"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "runtime watcher: running"
  echo "tmux session: $SESSION"
else
  echo "runtime watcher: not running"
fi

echo "log: $LOG_FILE"

if [[ -f "$LOG_FILE" ]]; then
  echo
  echo "== Latest diagnostic samples =="
  tail -60 "$LOG_FILE"
else
  echo "No runtime watcher log found."
fi

echo
echo "Safety: output excludes full command lines, environment values, credentials, tokens, cookies, and storageState contents."
