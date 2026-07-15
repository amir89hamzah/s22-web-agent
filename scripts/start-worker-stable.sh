#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="s22worker"
PORT="${BROWSER_WORKER_PORT:-3002}"
DISPLAY_VALUE="${BROWSER_DISPLAY:-:1}"
HEALTH_URL="http://127.0.0.1:${PORT}/health"
STATUS_URL="http://127.0.0.1:${PORT}/browser-task/status"
LOG_FILE="$ROOT_DIR/.runtime/worker-stable.log"
NODE_PID_FILE="$ROOT_DIR/.runtime/worker-node.pid"
DEBIAN_WORKER="/data/data/com.termux/files/home/projects/mobile-job-radar-agent/tools/proot-playwright-worker/server.mjs"

cd "$ROOT_DIR"
mkdir -p .runtime

if [ -f "$NODE_PID_FILE" ]; then
  OLD_NODE_PID="$(cat "$NODE_PID_FILE" 2>/dev/null || true)"

  if [ -n "$OLD_NODE_PID" ] && kill -0 "$OLD_NODE_PID" 2>/dev/null; then
    echo "FAIL: worker Node PID $OLD_NODE_PID is already alive."
    echo "Run: bash scripts/stop-worker-stable.sh"
    exit 2
  fi

  rm -f "$NODE_PID_FILE"
fi

command -v tmux >/dev/null 2>&1 || {
  echo "FAIL: tmux is not installed."
  exit 1
}

command -v proot-distro >/dev/null 2>&1 || {
  echo "FAIL: proot-distro is not available."
  exit 1
}

command -v curl >/dev/null 2>&1 || {
  echo "FAIL: curl is not available."
  exit 1
}

echo "== Stable Playwright worker start =="
echo "tmux session: $SESSION_NAME"
echo "worker URL: http://127.0.0.1:${PORT}"
echo "display: $DISPLAY_VALUE"
echo "network scope: local-only"
echo

if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Worker is already running under tmux session $SESSION_NAME."
    echo
    curl -fsS "$STATUS_URL" || true
    echo
    exit 0
  fi

  echo "FAIL: port ${PORT} is reachable, but tmux session $SESSION_NAME does not exist."
  echo "Another or orphan worker may be using the port."
  echo "Do not start a second worker."
  exit 2
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Removing stale tmux session: $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME" || true
fi

: > "$LOG_FILE"

cat > .runtime/s22-worker-foreground-debian.sh <<EOF_DEBIAN
#!/usr/bin/env bash
set -euo pipefail

cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent/tools/proot-playwright-worker

export DISPLAY="$DISPLAY_VALUE"
export PORT="$PORT"

echo "== S22 persistent Playwright worker =="
echo "startedAt: \$(date -Is 2>/dev/null || date)"
echo "display: \$DISPLAY"
echo "port: \$PORT"
echo "network scope: 127.0.0.1 only"

echo "\$\$" > /data/data/com.termux/files/home/projects/mobile-job-radar-agent/.runtime/worker-node.pid
exec node "$DEBIAN_WORKER"
EOF_DEBIAN

chmod 700 .runtime/s22-worker-foreground-debian.sh

proot-distro login debian -- bash -lc \
  "cp '$ROOT_DIR/.runtime/s22-worker-foreground-debian.sh' /usr/local/bin/s22-worker-foreground && chmod 700 /usr/local/bin/s22-worker-foreground"

echo "Starting tmux-held Debian worker..."

tmux new-session -d -s "$SESSION_NAME" \
  "proot-distro login debian -- bash -lc '/usr/local/bin/s22-worker-foreground 2>&1 | tee -a /data/data/com.termux/files/home/projects/mobile-job-radar-agent/.runtime/worker-stable.log'"

ready=0

for _ in $(seq 1 15); do
  if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    ready=1
    break
  fi

  if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    break
  fi

  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "FAIL: worker did not become reachable."
  echo
  echo "Recent log:"
  tail -40 "$LOG_FILE" 2>/dev/null || true
  echo
  echo "tmux output:"
  tmux capture-pane -pt "$SESSION_NAME" 2>/dev/null || true
  tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
  exit 1
fi

echo "PASS: stable worker is ready."
echo

curl -fsS "$HEALTH_URL"
echo
echo
echo "Persistent browser status:"
curl -fsS "$STATUS_URL"
echo
echo
echo "Log: $LOG_FILE"
echo "Stop with: bash scripts/stop-worker-stable.sh"
