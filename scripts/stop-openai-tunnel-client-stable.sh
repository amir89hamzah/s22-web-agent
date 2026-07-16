#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="${OPENAI_TUNNEL_TMUX_SESSION:-s22openai}"
PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"

cd "$ROOT_DIR"

echo "== Stable OpenAI tunnel-client stop =="

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Stopping tmux session: $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME" || true
else
  echo "No tunnel tmux session found."
fi

pkill -f "tunnel-client.*${PROFILE}" >/dev/null 2>&1 || true

for _ in $(seq 1 10); do
  if ! pgrep -f "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
  echo "FAIL: tunnel-client is still running."
  pgrep -af "tunnel-client.*${PROFILE}" || true
  exit 1
fi

echo "PASS: tunnel-client is stopped."
