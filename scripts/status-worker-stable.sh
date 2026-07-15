#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="s22worker"
PORT="${BROWSER_WORKER_PORT:-3002}"
HEALTH_URL="http://127.0.0.1:${PORT}/health"
STATUS_URL="http://127.0.0.1:${PORT}/browser-task/status"
LOG_FILE="$ROOT_DIR/.runtime/worker-stable.log"

cd "$ROOT_DIR"

echo "== Stable Playwright worker status =="
echo "worker URL: http://127.0.0.1:${PORT}"
echo

echo "tmux session:"
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "  running: $SESSION_NAME"
else
  echo "  not running"
fi

echo
echo "health:"
if curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null; then
  echo
else
  echo "  not reachable"
fi

echo
echo "persistent browser:"
if curl -fsS --max-time 3 "$STATUS_URL" 2>/dev/null; then
  echo
else
  echo "  unavailable"
fi

echo
echo "selected processes:"
ps -A -o pid=,ppid=,stat=,comm= 2>/dev/null \
  | awk '$4=="node" || $4=="proot" || $4=="chromium" || $4=="Xtigervnc" || $4=="websockify"' \
  || true

echo
echo "recent worker log:"
if [ -f "$LOG_FILE" ]; then
  tail -30 "$LOG_FILE"
else
  echo "  no log file"
fi
