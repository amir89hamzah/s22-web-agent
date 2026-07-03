#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SESSION="${SESSION_PUBLIC_TUNNEL_TMUX:-s22-cloudflared-public-temp}"
RUNTIME_DIR=".runtime"
TOKEN_ENV_FILE="$RUNTIME_DIR/cloudflared-public-temp.env"
RUNNER="$RUNTIME_DIR/cloudflared-public-temp-runner.sh"

usage_note() {
  echo "Usage: npm run session:novnc:public-temp:tunnel:start"
  echo
  echo "Either export CLOUDFLARE_TUNNEL_TOKEN first or paste it when prompted."
  echo "Do not paste the token into chat, docs, git, screenshots, or shell history."
}

if ! command -v tmux >/dev/null 2>&1; then
  echo "FAIL: tmux not found. Run: pkg install -y tmux" >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "FAIL: cloudflared command not found." >&2
  exit 1
fi

mkdir -p "$RUNTIME_DIR"
chmod 700 "$RUNTIME_DIR" 2>/dev/null || true

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "FAIL: Cloudflare public-temp tunnel tmux session already running: $SESSION" >&2
  echo "Status: npm run session:novnc:public-temp:tunnel:status" >&2
  echo "Stop:   npm run session:novnc:public-temp:tunnel:stop" >&2
  exit 1
fi

if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  usage_note
  echo
  read -r -s -p "Paste CLOUDFLARE_TUNNEL_TOKEN: " CLOUDFLARE_TUNNEL_TOKEN
  echo
  export CLOUDFLARE_TUNNEL_TOKEN
fi

if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  echo "FAIL: CLOUDFLARE_TUNNEL_TOKEN is empty." >&2
  exit 1
fi

cat > "$TOKEN_ENV_FILE" <<EOF_TOKEN
export CLOUDFLARE_TUNNEL_TOKEN='${CLOUDFLARE_TUNNEL_TOKEN}'
EOF_TOKEN
chmod 600 "$TOKEN_ENV_FILE"

cat > "$RUNNER" <<'EOF_RUNNER'
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
cd "$ROOT_DIR"

TOKEN_ENV_FILE=".runtime/cloudflared-public-temp.env"

if [[ ! -f "$TOKEN_ENV_FILE" ]]; then
  echo "FAIL: token env file not found. Stop and start the tunnel helper again."
  exit 1
fi

# Source token from a temporary runtime file, then remove the file immediately.
# Secret value is not printed by this script.
# Note: cloudflared still receives the token as its process argument, matching the existing Cloudflare token run mode.
# Do not share process listings while this connector is running.
set +x
# shellcheck disable=SC1090
source "$TOKEN_ENV_FILE"
rm -f "$TOKEN_ENV_FILE"
set -x

set +x
echo "== Phase 7N Cloudflare connector tmux runner =="
echo "Repo: $ROOT_DIR"
echo "Routes are controlled by Cloudflare Dashboard, not by this tmux runner."
echo "Expected dashboard routes:"
echo "  s22agent.aidesk.rest -> http://127.0.0.1:3003"
echo "  s22login.aidesk.rest -> http://127.0.0.1:6080 (temporary Phase 7N route)"
echo
echo "Starting cloudflared connector. Keep this tmux session running during the proof."
echo "Stop with: npm run session:novnc:public-temp:tunnel:stop"
echo

cloudflared tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN"
EOF_RUNNER
chmod 700 "$RUNNER"

tmux new-session -d -s "$SESSION" "bash '$ROOT_DIR/$RUNNER'"

sleep 2

echo "PASS: Cloudflare public-temp tunnel tmux session started: $SESSION"
echo
echo "Status:"
echo "  npm run session:novnc:public-temp:tunnel:status"
echo
echo "Attach log:"
echo "  tmux attach -t $SESSION"
echo
echo "Detach from tmux without stopping tunnel: Ctrl+b then d"
echo
echo "Stop:"
echo "  npm run session:novnc:public-temp:tunnel:stop"
echo
echo "Safety reminder: do not paste or print Cloudflare tokens."
