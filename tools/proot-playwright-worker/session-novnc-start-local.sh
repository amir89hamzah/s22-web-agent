#!/usr/bin/env bash
set -euo pipefail

SESSION="${SESSION_NOVNC_TMUX:-s22-novnc-local}"
NOVNC_HOST="${NOVNC_HOST:-127.0.0.1}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
VNC_HOST="${VNC_HOST:-127.0.0.1}"
VNC_PORT="${VNC_PORT:-5901}"
PROOT_NAME="${PROOT_NAME:-debian}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "PASS: local noVNC tmux session already running: $SESSION"
  tmux list-sessions | grep "$SESSION" || true
  exit 0
fi

DEBIAN_CMD=$(cat <<DEBIAN
set -euo pipefail

NOVNC_HOST="$NOVNC_HOST"
NOVNC_PORT="$NOVNC_PORT"
VNC_HOST="$VNC_HOST"
VNC_PORT="$VNC_PORT"

if ! command -v websockify >/dev/null 2>&1; then
  echo "FAIL: websockify not found inside Debian."
  echo "Install with: apt-get update && apt-get install -y novnc websockify"
  exit 2
fi

if [ ! -d /usr/share/novnc ]; then
  echo "FAIL: /usr/share/novnc not found."
  echo "Install with: apt-get update && apt-get install -y novnc"
  exit 2
fi

echo "Starting local-only noVNC gateway..."
echo "noVNC: http://\${NOVNC_HOST}:\${NOVNC_PORT}/vnc.html"
echo "Target VNC: \${VNC_HOST}:\${VNC_PORT}"
echo "Bind safety: noVNC is bound to \${NOVNC_HOST}, not public interface."

exec websockify --web=/usr/share/novnc "\${NOVNC_HOST}:\${NOVNC_PORT}" "\${VNC_HOST}:\${VNC_PORT}"
DEBIAN
)

tmux new-session -d -s "$SESSION" \
  "proot-distro login '$PROOT_NAME' -- bash -lc $(printf '%q' "$DEBIAN_CMD")"

sleep 2

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "PASS: local noVNC tmux session started: $SESSION"
else
  echo "FAIL: local noVNC tmux session did not start"
  exit 1
fi

echo
echo "Check log:"
echo "  tmux capture-pane -pt $SESSION -S -80"
echo
echo "Local URL on S22:"
echo "  http://127.0.0.1:${NOVNC_PORT}/vnc.html?host=127.0.0.1&port=${NOVNC_PORT}"
