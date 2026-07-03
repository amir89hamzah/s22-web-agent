#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PUBLIC_HOST="${1:-s22login.aidesk.rest}"

echo "== Phase 7N Option A public-temp noVNC status =="
echo "public host: $PUBLIC_HOST"
echo
echo "This status helper does not call Cloudflare APIs and does not prove Cloudflare Access state."
echo "Use it to confirm the S22-side local pieces before/while checking Cloudflare Dashboard."
echo
echo "Expected Cloudflare route for Phase 7N Option A:"
echo "  $PUBLIC_HOST -> http://127.0.0.1:6080"
echo
echo "Existing MCP route that should remain unchanged:"
echo "  s22agent.aidesk.rest -> http://127.0.0.1:3003"
echo
echo "== VNC status =="
npm run session:vnc:status || true

echo
echo "== local noVNC status =="
npm run session:novnc:status:local || true

echo
echo "== manual login job status =="
npm run session:manual-login:novnc:status || true

echo
echo "== URLs to test =="
echo "Local SSH-forward/browser URL:"
echo "  http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080"
echo
echo "Candidate public HTTPS URL:"
echo "  https://${PUBLIC_HOST}/vnc.html?host=${PUBLIC_HOST}&port=443"
echo
echo "== Safety reminder =="
echo "If this is a public test, confirm Cloudflare Access protection before logging into anything sensitive."
echo "Phase 7N first proof should use only the local demo login, not a real external account."
