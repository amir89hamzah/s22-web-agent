#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SESSION="${RUNTIME_WATCH_TMUX_SESSION:-s22-runtime-watch}"
INTERVAL="${RUNTIME_WATCH_INTERVAL:-5}"
LOG_DIR=".runtime/diagnostics"
LOG_FILE="$LOG_DIR/runtime-watch.log"

command -v tmux >/dev/null 2>&1 || {
  echo "FAIL: tmux is required." >&2
  exit 1
}

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "PASS: runtime watcher already running: $SESSION"
  echo "log: $LOG_FILE"
  exit 0
fi

mkdir -p "$LOG_DIR"

if [[ -f "$LOG_FILE" && -s "$LOG_FILE" ]]; then
  stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || date +%s)"
  mv "$LOG_FILE" "$LOG_DIR/runtime-watch-$stamp.log"
fi

: > "$LOG_FILE"

tmux new-session -d -s "$SESSION" \
  "cd '$(pwd)' && RUNTIME_WATCH_INTERVAL='$INTERVAL' bash scripts/runtime-watch-loop.sh"

sleep 1

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "FAIL: runtime watcher tmux session did not remain running." >&2
  echo "Check log: $LOG_FILE" >&2
  exit 1
fi

echo "PASS: runtime diagnostic watcher started"
echo "tmux session: $SESSION"
echo "interval seconds: $INTERVAL"
echo "log: $LOG_FILE"
echo "Safety: watcher records memory totals, process counts, and executable names only; it does not record full command lines or environment values."
