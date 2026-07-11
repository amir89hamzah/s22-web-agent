#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SESSION="${RUNTIME_WATCH_TMUX_SESSION:-s22-runtime-watch}"
LOG_FILE=".runtime/diagnostics/runtime-watch.log"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux kill-session -t "$SESSION"
  echo "PASS: stopped runtime watcher tmux session: $SESSION"
else
  echo "INFO: runtime watcher tmux session was not running: $SESSION"
fi

while IFS= read -r pid; do
  [[ -n "$pid" ]] || continue
  if [[ "$pid" != "$$" ]]; then
    kill "$pid" 2>/dev/null || true
  fi
done < <(pgrep -f '[r]untime-watch-loop.sh' 2>/dev/null || true)

sleep 1

if pgrep -f '[r]untime-watch-loop.sh' >/dev/null 2>&1; then
  echo "WARN: a runtime watch loop may still be visible." >&2
else
  echo "PASS: no runtime watch loop remains."
fi

if [[ -f "$LOG_FILE" ]]; then
  echo "log retained: $LOG_FILE"
  echo
  echo "== Final diagnostic samples =="
  tail -40 "$LOG_FILE"
fi
