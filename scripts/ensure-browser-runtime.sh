#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LOCK_DIR="$RUNTIME_DIR/browser-runtime-bootstrap.lock"
LOG_FILE="$RUNTIME_DIR/browser-runtime-bootstrap.log"
WORKER_HEALTH="http://127.0.0.1:3002/health"

cd "$ROOT_DIR"
mkdir -p "$RUNTIME_DIR"

worker_ready() {
  curl -fsS --max-time 2 "$WORKER_HEALTH" >/dev/null 2>&1
}

vnc_ready() {
  python3 - <<'PY'
import socket
import sys

sock = socket.socket()
sock.settimeout(2)

try:
    sock.connect(("127.0.0.1", 5901))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
}

if worker_ready; then
  exit 0
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another browser runtime bootstrap is already running."

  for _ in $(seq 1 60); do
    if worker_ready; then
      exit 0
    fi

    if [ ! -d "$LOCK_DIR" ]; then
      break
    fi

    sleep 1
  done

  if worker_ready; then
    exit 0
  fi

  echo "FAIL: browser runtime bootstrap did not complete."
  exit 1
fi

trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

{
  echo
  echo "========================================"
  echo "Browser runtime bootstrap"
  echo "Time: $(date -Is 2>/dev/null || date)"
  echo "========================================"

  if vnc_ready; then
    echo "VNC 5901 is already reachable; preserving it."
  else
    echo "VNC is unavailable; starting stable VNC..."
    npm run session:vnc:start:stable

    if ! vnc_ready; then
      echo "FAIL: VNC did not become reachable on 5901."
      exit 1
    fi
  fi

  if worker_ready; then
    echo "Worker 3002 became reachable."
  else
    echo "Worker is unavailable; starting stable worker..."
    npm run worker:start:stable
  fi

  if ! worker_ready; then
    echo "FAIL: worker did not become reachable on 3002."
    exit 1
  fi

  echo "PASS: VNC and worker runtime are ready."
} 2>&1 | tee -a "$LOG_FILE"
