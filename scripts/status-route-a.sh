#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_MCP_URL="${PUBLIC_MCP_URL:-https://s22agent.aidesk.rest/mcp}"

echo "Route A status"
echo "=============="
echo
echo "Public MCP URL: $PUBLIC_MCP_URL"
echo

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Git:"
  echo "  branch: $(git branch --show-current 2>/dev/null || echo unknown)"
  dirty="$(git status --short 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo "  status:"
    echo "$dirty" | sed 's/^/    /'
  else
    echo "  status: clean"
  fi
  echo
fi

echo "API status:"
npm run api:status || true
echo

echo "MCP HTTP status:"
npm run mcp:http:status || true
echo

echo "cloudflared process:"
if pgrep -af cloudflared >/dev/null 2>&1; then
  pgrep -af cloudflared
else
  echo "cloudflared is not running"
fi
echo

echo "Public no-token check:"
curl -i -sS --max-time 15 "$PUBLIC_MCP_URL" | sed -n '1,14p' || true
echo
echo "Expected when Route A is running and auth is enabled: 401 Unauthorized"
