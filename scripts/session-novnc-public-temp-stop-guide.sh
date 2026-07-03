#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PUBLIC_HOST="${1:-s22login.aidesk.rest}"
PROFILE="${SESSION_PUBLIC_TEMP_PROFILE:-novnc-public-demo}"
STATE_FILE=".runtime/manual-login-jobs/${PROFILE}.json"

echo "== Phase 7N Option A public-temp noVNC kill switch guide =="
echo "public host: $PUBLIC_HOST"
echo "profile: $PROFILE"
echo
echo "This helper stops local S22 services that support the temporary noVNC login path."
echo "It does NOT edit Cloudflare Dashboard routes or Access applications."
echo
echo "== Stop local login/noVNC/VNC/demo services =="

if [ -f "$STATE_FILE" ] && grep -q '"status"[[:space:]]*:[[:space:]]*"completed"' "$STATE_FILE"; then
  echo "Manual login state is already completed; preserving completed state instead of cancelling."
  echo "Stale worker cleanup will be handled by VNC/proot stop."
else
  npm run session:manual-login:novnc:cancel -- "$PROFILE" || true
fi

npm run session:novnc:stop:local || true
npm run session:vnc:stop:stable || true
npm run session:demo:stop || true

echo
echo "== Cloudflare Dashboard manual cleanup checklist =="
echo "1. Remove or disable the temporary route:"
echo "   $PUBLIC_HOST -> http://127.0.0.1:6080"
echo
echo "2. Keep the MCP route unchanged unless intentionally stopping MCP:"
echo "   s22agent.aidesk.rest -> http://127.0.0.1:3003"
echo
echo "3. If you created a Cloudflare Access application for $PUBLIC_HOST, disable or keep it locked down."
echo
echo "4. Check public URL no longer opens noVNC:"
echo "   https://${PUBLIC_HOST}/"
echo
echo "== Local status after stop =="
echo
npm run session:vnc:status || true

echo
echo "PASS: local Phase 7N noVNC support services stopped or stop attempted."
echo "Reminder: remove/disable the Cloudflare route manually in the dashboard if it was created."
