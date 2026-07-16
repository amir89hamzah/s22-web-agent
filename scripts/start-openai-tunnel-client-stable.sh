#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="${OPENAI_TUNNEL_TMUX_SESSION:-s22openai}"
PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"
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
  echo "Attaching to: $SESSION_NAME"
  echo
  exec tmux attach-session -t "$SESSION_NAME"
fi

if pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
  echo "FAIL: tunnel-client is already running outside tmux."
  echo "Stop the foreground tunnel with Ctrl+C before starting stable mode."
  exit 2
fi

cat > "$RUNNER" <<EOF_RUNNER
#!/usr/bin/env bash
set -euo pipefail

cd "$ROOT_DIR"
export OPENAI_TUNNEL_PROFILE="$PROFILE"

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
  echo
  tail -60 "$LOG_FILE" 2>/dev/null || true
  exit 1
fi

echo "tmux session created."
echo
echo "The hidden API-key prompt will appear next."
echo "After the tunnel connects, detach with: Ctrl+b then d"
echo "Closing SSH after detaching will not stop the tunnel."
echo

exec tmux attach-session -t "$SESSION_NAME"
