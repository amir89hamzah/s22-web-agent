#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="${OPENAI_TUNNEL_TMUX_SESSION:-s22openai}"
PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"
ATTACH="${OPENAI_TUNNEL_ATTACH:-1}"
KEY_FILE="${OPENAI_TUNNEL_KEY_FILE:-$HOME/.config/s22-web-agent/control-plane-api-key}"
RUNTIME_DIR="$ROOT_DIR/.runtime"
RUNNER="$RUNTIME_DIR/s22-openai-tunnel-foreground-debian.sh"
LOG_FILE="$RUNTIME_DIR/openai-tunnel-stable.log"
MCP_HEALTH="http://127.0.0.1:3003/health"

cd "$ROOT_DIR"
mkdir -p "$RUNTIME_DIR"

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

echo "== Stable OpenAI tunnel-client start =="
echo "Profile: $PROFILE"
echo "tmux session: $SESSION_NAME"
echo "Log: $LOG_FILE"
echo

if ! curl -fsS --max-time 3 "$MCP_HEALTH" >/dev/null 2>&1; then
  echo "FAIL: local MCP on port 3003 is not reachable."
  echo "Run first: npm run openai:tunnel:start"
  exit 2
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Tunnel tmux session already exists."

  if [ "$ATTACH" = "1" ]; then
    echo "Attaching to: $SESSION_NAME"
    exec tmux attach-session -t "$SESSION_NAME"
  fi

  echo "PASS: existing tunnel session retained."
  exit 0
fi

if pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
  echo "FAIL: tunnel-client is already running outside tmux."
  exit 2
fi

KEY_FILE_Q="$(printf '%q' "$KEY_FILE")"

cat > "$RUNNER" <<EOF_RUNNER
#!/usr/bin/env bash
set -euo pipefail

cd "$ROOT_DIR"
export OPENAI_TUNNEL_PROFILE="$PROFILE"
KEY_FILE=$KEY_FILE_Q

if [ -z "\${CONTROL_PLANE_API_KEY:-}" ]; then
  if [ ! -r "\$KEY_FILE" ]; then
    echo "FAIL: OpenAI runtime API key file is not readable."
    exit 1
  fi

  CONTROL_PLANE_API_KEY="\$(cat "\$KEY_FILE")"
  export CONTROL_PLANE_API_KEY
fi

exec bash scripts/run-openai-tunnel-client-debian.sh
EOF_RUNNER

chmod 700 "$RUNNER"
: > "$LOG_FILE"
chmod 600 "$LOG_FILE"

tmux new-session -d -s "$SESSION_NAME" \
  "proot-distro login debian -- bash -lc 'exec bash \"$RUNNER\"'"

tmux pipe-pane -o -t "$SESSION_NAME" \
  "cat >> '$LOG_FILE'"

sleep 1

if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "FAIL: tunnel tmux session exited during startup."
  tail -60 "$LOG_FILE" 2>/dev/null || true
  exit 1
fi

if [ "$ATTACH" = "1" ]; then
  echo "tmux session created."
  echo "Detach without stopping it using: Ctrl+b then d"
  exec tmux attach-session -t "$SESSION_NAME"
fi

ready=0

for _ in $(seq 1 45); do
  if pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
    ready=1
    break
  fi

  if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    break
  fi

  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "FAIL: tunnel-client did not become ready."
  tail -60 "$LOG_FILE" 2>/dev/null || true
  tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
  exit 1
fi

echo "PASS: tunnel-client is running in tmux."
