#!/data/data/com.termux/files/usr/bin/bash

set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$APP_DIR/.runtime"
API_URL="${API_URL:-http://127.0.0.1:3001}"
HEALTH_URL="$API_URL/health"
SCAN_URL="$API_URL/scan"
PAGES_URL="$API_URL/pages"
SMOKE_SCAN_OUTPUT="$RUNTIME_DIR/smoke-scan-response.json"

mkdir -p "$RUNTIME_DIR"

cd "$APP_DIR"

STARTED_API=0

cleanup() {
  if [ "$STARTED_API" = "1" ]; then
    echo
    echo "Stopping API server started by smoke test..."
    npm run api:stop
  fi
}

trap cleanup EXIT

step() {
  echo
  echo "==> $1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command curl
require_command node
require_command npm

step "Git status"
GIT_STATUS="$(git status --short)"

if [ -n "$GIT_STATUS" ]; then
  echo "$GIT_STATUS"

  if [ "${SMOKE_ALLOW_DIRTY:-0}" != "1" ]; then
    echo "Working tree is not clean. Commit or stash changes before smoke test."
    echo "For development testing, run: SMOKE_ALLOW_DIRTY=1 npm run smoke"
    exit 1
  fi

  echo "SMOKE_ALLOW_DIRTY=1 set, continuing with dirty working tree."
else
  echo "Working tree clean"
fi

step "Check API health"
if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "API already running"
else
  echo "API not reachable. Starting API..."
  npm run api:start
  STARTED_API=1
fi

step "API health response"
curl -fsS "$HEALTH_URL"
echo

step "API scan example.com"
curl -fsS -X POST "$SCAN_URL" \
  -H "Content-Type: application/json" \
  -d '{"url":"example.com"}' \
  -o "$SMOKE_SCAN_OUTPUT"

echo "Saved smoke scan response to $SMOKE_SCAN_OUTPUT"

if grep -q "https://example.com/" "$SMOKE_SCAN_OUTPUT"; then
  echo "Scan response contains normalized URL"
else
  echo "Scan response did not contain expected normalized URL"
  cat "$SMOKE_SCAN_OUTPUT"
  exit 1
fi

step "API pages"
curl -fsS "$PAGES_URL" >/dev/null
echo "Pages endpoint reachable"

step "MCP server syntax check"
node --check src/mcp-server.mjs
echo "MCP server syntax ok"

step "MCP server startup check"
if command -v timeout >/dev/null 2>&1; then
  timeout 3 npm run mcp >/dev/null 2>&1 || true
  echo "MCP startup check completed"
else
  echo "timeout command not found, skipping MCP startup check"
fi

step "Playwright worker status"
if npm run worker:status; then
  echo "Worker reachable"
else
  echo "Worker not reachable. This is okay if Debian proot worker is not running."
fi

step "Smoke test completed"
echo "S22 Web Agent smoke test passed"
