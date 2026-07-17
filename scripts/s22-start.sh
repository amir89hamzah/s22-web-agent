#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="${S22_CONFIG_DIR:-$HOME/.config/s22-web-agent}"
OPENAI_KEY_FILE="$CONFIG_DIR/control-plane-api-key"
TUNNEL_SESSION="${OPENAI_TUNNEL_TMUX_SESSION:-s22openai}"
PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"

cd "$ROOT_DIR"

runtime_was_ready=0
tunnel_was_running=0
wake_lock_acquired=0

if curl -fsS --max-time 2 http://127.0.0.1:3001/health >/dev/null 2>&1 &&
   curl -fsS --max-time 2 http://127.0.0.1:3003/health >/dev/null 2>&1; then
  runtime_was_ready=1
fi

if tmux has-session -t "$TUNNEL_SESSION" 2>/dev/null; then
  tunnel_was_running=1
fi

rollback() {
  local status="$?"
  trap - ERR

  echo
  echo "Startup failed. Rolling back components started by this command."

  if [ "$tunnel_was_running" -eq 0 ]; then
    npm run openai:tunnel:client:stop:stable >/dev/null 2>&1 || true
  fi

  if [ "$runtime_was_ready" -eq 0 ]; then
    npm run openai:tunnel:stop >/dev/null 2>&1 || true
  fi

  if [ "$wake_lock_acquired" -eq 1 ] &&
     command -v termux-wake-unlock >/dev/null 2>&1; then
    termux-wake-unlock >/dev/null 2>&1 || true
  fi

  exit "$status"
}

trap rollback ERR

echo "== S22 Web Agent start =="

if [ ! -r "$OPENAI_KEY_FILE" ]; then
  echo "FAIL: OpenAI runtime API key is not configured."
  echo "Run once: npm run s22:secrets:setup"
  exit 1
fi

if [ ! -s "$OPENAI_KEY_FILE" ]; then
  echo "FAIL: OpenAI runtime API key file is empty."
  exit 1
fi

key_mode="$(stat -c '%a' "$OPENAI_KEY_FILE" 2>/dev/null || true)"

case "$key_mode" in
  400|600) ;;
  *)
    echo "FAIL: unsafe permission on OpenAI key file: ${key_mode:-unknown}"
    echo "Expected permission: 600"
    exit 1
    ;;
esac

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
  wake_lock_acquired=1
fi

npm run openai:tunnel:start

OPENAI_TUNNEL_ATTACH=0 \
OPENAI_TUNNEL_KEY_FILE="$OPENAI_KEY_FILE" \
npm run openai:tunnel:client:start:stable

curl -fsS --max-time 3 http://127.0.0.1:3001/health >/dev/null
curl -fsS --max-time 3 http://127.0.0.1:3003/health >/dev/null
tmux has-session -t "$TUNNEL_SESSION"

if ! pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
  echo "FAIL: tunnel-client process is not visible."
  exit 1
fi

trap - ERR

echo
echo "PASS: S22 Web Agent READY"
echo "API:             ready on 127.0.0.1:3001"
echo "MCP:             ready on 127.0.0.1:3003"
echo "OpenAI tunnel:   running in tmux $TUNNEL_SESSION"
echo "Browser runtime: starts automatically when requested"
echo "Public noVNC:    off"
