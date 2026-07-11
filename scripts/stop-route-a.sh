#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Stopping Route A runtime..."
echo

echo "Stopping cloudflared..."
pkill -f '[c]loudflared' >/dev/null 2>&1 || true

echo "Stopping MCP HTTP..."
npm run mcp:http:stop || true

echo "Stopping API..."
npm run api:stop || true

echo
echo "Remaining cloudflared process check:"
if pgrep -f '[c]loudflared' >/dev/null 2>&1; then
  count="$(pgrep -f '[c]loudflared' | wc -l | tr -d ' ')"
  echo "cloudflared is still running"
  echo "process count: $count"
  echo "command line: suppressed to avoid exposing tunnel token material"
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
