#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="s22worker"
PORT="${BROWSER_WORKER_PORT:-3002}"

STATUS_FILE="$ROOT_DIR/.runtime/worker-stop-status.json"
NODE_PID_FILE="$ROOT_DIR/.runtime/worker-node.pid"

HEALTH_URL="http://127.0.0.1:${PORT}/health"
STATUS_URL="http://127.0.0.1:${PORT}/browser-task/status"
STOP_URL="http://127.0.0.1:${PORT}/browser-task/stop"

DEBIAN_WORKER="/data/data/com.termux/files/home/projects/mobile-job-radar-agent/tools/proot-playwright-worker/server.mjs"

cd "$ROOT_DIR"
mkdir -p .runtime
rm -f "$STATUS_FILE"

is_expected_worker_pid() {
  local pid="$1"

  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  [[ -r "/proc/$pid/cmdline" ]] || return 1

  tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null \
    | grep -Fq "$DEBIAN_WORKER"
}

echo "== Stable Playwright worker stop =="

if curl -fsS --max-time 3 "$STATUS_URL" >"$STATUS_FILE" 2>/dev/null; then
  JOB="$(
    node -e '
      const fs = require("fs");
      const file = process.argv[1];
      const data = JSON.parse(fs.readFileSync(file, "utf8"));

      if (data.active && data.job) {
        process.stdout.write(String(data.job));
      }
    ' "$STATUS_FILE" 2>/dev/null || true
  )"

  if [ -n "$JOB" ]; then
    echo "Stopping active browser task: $JOB"

    curl -fsS --max-time 10 \
      -X POST \
      -H 'content-type: application/json' \
      --data "{\"job\":\"$JOB\",\"reason\":\"worker_shutdown\"}" \
      "$STOP_URL" >/dev/null 2>&1 || true
  fi
fi

rm -f "$STATUS_FILE"

NODE_PID=""

if [ -f "$NODE_PID_FILE" ]; then
  NODE_PID="$(cat "$NODE_PID_FILE" 2>/dev/null || true)"
fi

if is_expected_worker_pid "$NODE_PID"; then
  echo "Stopping worker Node PID: $NODE_PID"
  kill "$NODE_PID" 2>/dev/null || true

  for _ in $(seq 1 5); do
    if ! kill -0 "$NODE_PID" 2>/dev/null; then
      break
    fi

    sleep 1
  done

  if kill -0 "$NODE_PID" 2>/dev/null; then
    echo "Worker Node still alive; sending KILL."
    kill -9 "$NODE_PID" 2>/dev/null || true
    sleep 1
  fi
else
  echo "No verified live worker Node PID found."
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Stopping tmux session: $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
else
  echo "No tmux session found."
fi

rm -f "$NODE_PID_FILE"
sleep 1

if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  echo "Worker still reachable; using targeted TERM fallback."

  proot-distro login debian -- bash -lc \
    "pkill -TERM -f '[n]ode $DEBIAN_WORKER' 2>/dev/null || true" \
    >/dev/null 2>&1 || true

  sleep 2
fi

if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  echo "Worker still reachable; using targeted KILL fallback."

  proot-distro login debian -- bash -lc \
    "pkill -KILL -f '[n]ode $DEBIAN_WORKER' 2>/dev/null || true" \
    >/dev/null 2>&1 || true

  sleep 1
fi

if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  echo "FAIL: worker port ${PORT} is still reachable."
  exit 1
fi

echo "PASS: worker is stopped and port ${PORT} is clear."
