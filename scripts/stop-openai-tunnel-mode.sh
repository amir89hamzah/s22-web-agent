#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"

echo "Stopping OpenAI Secure MCP Tunnel mode runtime..."
echo

echo "Stopping tunnel-client profile $PROFILE if visible..."
pkill -f "tunnel-client.*${PROFILE}" >/dev/null 2>&1 || true

echo "Stopping MCP HTTP..."
npm run mcp:http:stop || true

echo "Stopping API..."
npm run api:stop || true

echo
echo "Remaining tunnel-client process check:"
if pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1; then
  pgrep -af "tunnel-client.*${PROFILE}" || true
else
  echo "tunnel-client profile is not running"
fi

echo
echo "MCP HTTP status:"
npm run mcp:http:status || true

echo
echo "API status:"
npm run api:status || true

echo
echo "OpenAI tunnel mode stop complete."
