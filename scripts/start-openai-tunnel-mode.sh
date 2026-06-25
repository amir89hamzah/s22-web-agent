#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"
MCP_HOST="${MCP_HTTP_HOST:-127.0.0.1}"
MCP_PORT="${MCP_HTTP_PORT:-3003}"
MCP_PATH="${MCP_HTTP_PATH:-/mcp}"
TUNNEL_CLIENT_PATH="${TUNNEL_CLIENT:-/data/data/com.termux/files/home/tools/openai-tunnel/tunnel-client}"

printf '%s\n' "Starting OpenAI Secure MCP Tunnel local runtime..."
printf '%s\n' "Mode: OpenAI Secure MCP Tunnel"
printf '%s\n' "Profile: $PROFILE"
printf '%s\n' "Local MCP URL: http://127.0.0.1:${MCP_PORT}${MCP_PATH}"
printf '%s\n' "Debian tunnel-client path: $TUNNEL_CLIENT_PATH"
printf '%s\n' "Security boundary: no Cloudflare, no public 3001/3002/3003 exposure from this helper."
printf '%s\n' ""

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Git branch: $(git branch --show-current 2>/dev/null || echo unknown)"
  dirty="$(git status --short 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo "WARNING: working tree is not clean:"
    echo "$dirty"
  else
    echo "Git status: clean"
  fi
  echo
fi

if pgrep -af 'cloudflared' >/dev/null 2>&1; then
  echo "WARNING: cloudflared appears to be running. OpenAI tunnel mode should not need Route A."
  pgrep -af 'cloudflared' || true
  echo
fi

unset MCP_HTTP_TOKEN
export MCP_HTTP_HOST="$MCP_HOST"
export MCP_HTTP_PORT="$MCP_PORT"
export MCP_HTTP_PATH="$MCP_PATH"

echo "Starting API on port 3001..."
npm run api:start

echo
echo "Starting MCP HTTP on ${MCP_HOST}:${MCP_PORT}${MCP_PATH} with auth disabled..."
npm run mcp:http:start

echo
echo "Status checks:"
npm run api:status || true
echo
npm run mcp:http:status || true

echo
echo "Local MCP HTTP health:"
curl -sS "http://127.0.0.1:${MCP_PORT}/health" || true

echo
echo
echo "Next: open a second terminal and run tunnel-client inside Debian proot:"
cat <<EOF_NEXT

proot-distro login debian
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
npm run openai:tunnel:client:debian

EOF_NEXT
