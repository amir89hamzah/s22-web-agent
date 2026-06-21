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

echo "Starting Cloudflare Named Tunnel..."
echo "Security rule: this tunnel should route only to http://127.0.0.1:3003"
echo

cloudflared tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN"
