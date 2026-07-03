#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PUBLIC_HOST="${1:-s22login.aidesk.rest}"
LOCAL_NOVNC_URL="http://127.0.0.1:6080"
LOCAL_NOVNC_PAGE="http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080"
PUBLIC_NOVNC_URL="https://${PUBLIC_HOST}/vnc.html?host=${PUBLIC_HOST}&port=443"

echo "== Phase 7N Option A public-temp noVNC start guide =="
echo "public host: $PUBLIC_HOST"
echo
echo "This guide does NOT start Cloudflare, does NOT create a public route, and does NOT expose anything by itself."
echo
echo "Safety boundary:"
echo "- Do not modify the existing MCP route: s22agent.aidesk.rest -> http://127.0.0.1:3003"
echo "- Use a separate temporary login host, for example: $PUBLIC_HOST"
echo "- Cloudflare route target must be: $LOCAL_NOVNC_URL"
echo "- Raw VNC 5901 must remain local-only."
echo "- API 3001 and Playwright worker 3002 must not be exposed."
echo "- storageState remains local under .runtime/sessions/<profile>/."
echo "- Never print passwords, cookies, tokens, MFA codes, or storageState JSON."
echo
echo "== Current local service status =="
echo
echo "VNC status:"
npm run session:vnc:status || true

echo
echo "local noVNC status:"
npm run session:novnc:status:local || true

echo
echo "manual login jobs:"
npm run session:manual-login:novnc:status || true

echo
echo "== Operator setup checklist for Cloudflare Dashboard =="
echo "1. Keep existing MCP route unchanged:"
echo "   s22agent.aidesk.rest -> http://127.0.0.1:3003"
echo
echo "2. Add a separate temporary route for noVNC:"
echo "   $PUBLIC_HOST -> $LOCAL_NOVNC_URL"
echo
echo "3. Protect $PUBLIC_HOST with Cloudflare Access if available."
echo "   Recommended policy: allow only your email/account."
echo
echo "4. Start Phase 7M local login flow before testing public noVNC:"
echo "   npm run session:demo:start"
echo "   SESSION_LOGIN_TIMEOUT_MS=900000 npm run session:manual-login:novnc:start -- novnc-public-demo http://127.0.0.1:3107/login"
echo
echo "5. Test local noVNC first:"
echo "   $LOCAL_NOVNC_PAGE"
echo
echo "6. Then test public HTTPS noVNC:"
echo "   $PUBLIC_NOVNC_URL"
echo
echo "7. After login succeeds, complete and scan:"
echo "   SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:manual-login:novnc:complete -- novnc-public-demo http://127.0.0.1:3107/secure \"S22 DEMO AUTH PASS\""
echo
echo "8. Kill switch after proof:"
echo "   npm run session:novnc:public-temp:stop-guide -- $PUBLIC_HOST"
echo
echo "== Important public URL note =="
echo "For local noVNC, the browser can use host=127.0.0.1 because the browser reaches S22 via SSH local forward."
echo "For public noVNC, the browser must use the public hostname in the noVNC URL, not 127.0.0.1."
echo
echo "Local noVNC URL:"
echo "  $LOCAL_NOVNC_PAGE"
echo
echo "Candidate public noVNC URL:"
echo "  $PUBLIC_NOVNC_URL"
echo
echo "PASS: Phase 7N guide printed. No public service was started by this script."
