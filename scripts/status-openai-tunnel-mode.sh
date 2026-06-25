#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"
MCP_PORT="${MCP_HTTP_PORT:-3003}"

echo "OpenAI Secure MCP Tunnel mode status"
echo "====================================="
echo "Profile: $PROFILE"
echo "Expected local MCP URL: http://127.0.0.1:${MCP_PORT}/mcp"
echo

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Git:"
  echo " branch: $(git branch --show-current 2>/dev/null || echo unknown)"
  dirty="$(git status --short 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo " status:"
    echo "$dirty" | sed 's/^/  /'
  else
    echo " status: clean"
  fi
  echo
fi

echo "API status:"
npm run api:status || true

echo
echo "MCP HTTP status:"
npm run mcp:http:status || true

echo
echo "MCP HTTP auth mode:"
curl -sS "http://127.0.0.1:${MCP_PORT}/health" || true

echo
echo "tunnel-client process for profile $PROFILE:"
if pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
  pgrep -af "tunnel-client.*${PROFILE}"
else
  echo "not running or not visible from this shell"
fi

echo
echo "cloudflared check:"
if pgrep -af 'cloudflared' >/dev/null 2>&1; then
  echo "WARNING: cloudflared is running; this is not needed for OpenAI tunnel mode."
  pgrep -af 'cloudflared' || true
else
  echo "cloudflared is not running"
fi
