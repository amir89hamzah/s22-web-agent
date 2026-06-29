#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-example-proof}"
URL="${2:-https://example.com/}"
DOMAIN="${3:-}"

DISPLAY_NUM="${SESSION_VNC_DISPLAY:-1}"

if [[ ! "$PROFILE" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "ERROR: invalid profile name. Use letters, numbers, dot, underscore, dash only." >&2
  exit 1
fi

if [[ "$URL" != http://* && "$URL" != https://* ]]; then
  echo "ERROR: URL must start with http:// or https://." >&2
  exit 1
fi

echo "== Session Capture Mode =="
echo
echo "This helper must be run from inside Debian proot while local VNC is already running."
echo
echo "Manual flow:"
echo "  1) proot-distro login debian"
echo "  2) cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent"
echo "  3) vncserver -localhost yes :${DISPLAY_NUM} -geometry 1280x720 -depth 24"
echo "  4) Open AVNC on S22 and connect to 127.0.0.1:$((5900 + DISPLAY_NUM))"
echo "  5) Run:"
echo
echo "DISPLAY=:${DISPLAY_NUM} node tools/proot-playwright-worker/session-capture.mjs --profile '$PROFILE' --url '$URL'${DOMAIN:+ --domain '$DOMAIN'}"
echo
echo "Do not paste passwords, cookies, tokens, or storageState into ChatGPT."
echo "Stop VNC after capture with: vncserver -kill :${DISPLAY_NUM}"
