#!/usr/bin/env bash
set -euo pipefail

if [ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_TUNNEL_TOKEN is not set."
  echo
  echo "Example:"
  echo "  export CLOUDFLARE_TUNNEL_TOKEN='replace-with-cloudflare-token'"
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ERROR: cloudflared command not found."
  echo "Install cloudflared first, then retry."
  exit 1
fi

echo "Starting Cloudflare Named Tunnel connector..."
echo
echo "This starts the connector for routes already configured in the Cloudflare dashboard."
echo "It does not create, edit, or delete Cloudflare routes."
echo
echo "Expected Route A MCP route:"
echo "  s22agent.aidesk.rest -> http://127.0.0.1:3003"
echo
echo "Optional Phase 7N temporary noVNC route, only when intentionally configured:"
echo "  s22login.aidesk.rest -> http://127.0.0.1:6080"
echo
echo "Safety boundary:"
echo "- Do not expose raw VNC 5901."
echo "- Do not expose API 3001 or Playwright worker 3002."
echo "- Stop local noVNC/VNC and remove or disable the temporary login route after Phase 7N proof."
echo

cloudflared tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN"
