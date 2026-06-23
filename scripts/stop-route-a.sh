#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Stopping Route A runtime..."
echo

echo "Stopping cloudflared..."
pkill -f cloudflared >/dev/null 2>&1 || true

echo "Stopping MCP HTTP..."
npm run mcp:http:stop || true

echo "Stopping API..."
npm run api:stop || true

echo
echo "Remaining cloudflared process check:"
if pgrep -af cloudflared >/dev/null 2>&1; then
  pgrep -af cloudflared
else
  echo "cloudflared is not running"
fi

echo
echo "MCP HTTP status:"
npm run mcp:http:status || true

echo
echo "API status:"
npm run api:status || true

echo
echo "Route A stop complete."
