#!/data/data/com.termux/files/usr/bin/bash

PORT="${BROWSER_WORKER_PORT:-3002}"
WORKER_URL="${BROWSER_WORKER_URL:-http://127.0.0.1:$PORT}"
HEALTH_URL="$WORKER_URL/health"

echo "Playwright worker status check"
echo "Worker URL: $WORKER_URL"
echo "Health URL: $HEALTH_URL"
echo

if command -v curl >/dev/null 2>&1; then
  HEALTH_RESPONSE="$(curl -fsS "$HEALTH_URL" 2>/dev/null || true)"

  if [ -n "$HEALTH_RESPONSE" ]; then
    echo "Health: reachable"
    echo "$HEALTH_RESPONSE"
    exit 0
  else
    echo "Health: not reachable"
    echo
    echo "Start the worker inside Debian proot:"
    echo "  proot-distro login debian"
    echo "  cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent/tools/proot-playwright-worker"
    echo "  node server.mjs"
    exit 1
  fi
else
  echo "curl not found, cannot check worker health"
  exit 1
fi
