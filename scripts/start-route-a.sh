#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_MCP_URL="${PUBLIC_MCP_URL:-https://s22agent.aidesk.rest/mcp}"

echo "Starting Route A runtime..."
echo
echo "Public MCP URL: $PUBLIC_MCP_URL"
echo "Security boundary:"
echo "  Public  -> Cloudflare Named Tunnel -> http://127.0.0.1:3003"
echo "  Private -> API 3001 and Playwright worker 3002"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node command not found."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm command not found."
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ERROR: cloudflared command not found."
  echo "Install cloudflared first, then retry."
  exit 1
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null || true)"
  dirty="$(git status --short 2>/dev/null || true)"
  echo "Git branch: ${branch:-unknown}"
  if [ -n "$dirty" ]; then
    echo "WARNING: working tree is not clean:"
    echo "$dirty"
    echo
  else
    echo "Git status: clean"
  fi
  echo
fi

if [ -z "${MCP_HTTP_TOKEN:-}" ]; then
  read -r -s -p "Paste MCP_HTTP_TOKEN: " MCP_HTTP_TOKEN
  echo
  export MCP_HTTP_TOKEN
fi

if [ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  read -r -s -p "Paste CLOUDFLARE_TUNNEL_TOKEN: " CLOUDFLARE_TUNNEL_TOKEN
  echo
  export CLOUDFLARE_TUNNEL_TOKEN
fi

cleanup() {
  echo
  echo "Stopping Route A background services..."
  bash scripts/stop-mcp-http.sh >/dev/null 2>&1 || true
  bash scripts/stop-api.sh >/dev/null 2>&1 || true
  echo "Route A cleanup complete."
}

trap cleanup EXIT INT TERM

echo
echo "Starting internal API on port 3001..."
npm run api:start
npm run api:status

echo
echo "Starting MCP HTTP server on port 3003..."
npm run mcp:http:start
npm run mcp:http:status

echo
echo "Local no-token auth check:"
set +e
curl -i -sS --max-time 10 http://127.0.0.1:3003/mcp | sed -n '1,12p'
set -e
echo "Expected when auth is enabled: HTTP/1.1 401 Unauthorized"
echo

echo "Starting Cloudflare Named Tunnel..."
echo "Keep this terminal open while Route A is running."
echo "Press Ctrl+C to stop tunnel, MCP HTTP, and API."
echo

cloudflared tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN"
