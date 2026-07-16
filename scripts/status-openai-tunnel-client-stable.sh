#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="${OPENAI_TUNNEL_TMUX_SESSION:-s22openai}"
PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"
LOG_FILE="$ROOT_DIR/.runtime/openai-tunnel-stable.log"

cd "$ROOT_DIR"

echo "== Stable OpenAI tunnel-client status =="
echo "Profile: $PROFILE"
echo "tmux session: $SESSION_NAME"
echo

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "tmux: running"
else
  echo "tmux: not running"
fi

echo
echo "Tunnel process:"
if pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
  pgrep -af "tunnel-client.*${PROFILE}"
else
  echo "not running"
fi

echo
echo "Local MCP:"
curl -fsS --max-time 3 \
  http://127.0.0.1:3003/health 2>/dev/null ||
  echo "not reachable"

echo
echo "Recent tmux output:"
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux capture-pane -pt "$SESSION_NAME" -S -40 2>/dev/null || true
elif [ -f "$LOG_FILE" ]; then
  tail -40 "$LOG_FILE" 2>/dev/null || true
fi
