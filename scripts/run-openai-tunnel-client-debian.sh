#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"
TUNNEL_CLIENT="${TUNNEL_CLIENT:-/data/data/com.termux/files/home/tools/openai-tunnel/tunnel-client}"
DOCTOR_LOG="$(mktemp)"

cleanup() {
  rm -f "$DOCTOR_LOG"
}
trap cleanup EXIT

echo "OpenAI Secure MCP Tunnel Debian runner"
echo "======================================"
echo "Profile: $PROFILE"
echo "Tunnel client: $TUNNEL_CLIENT"
echo

if [ ! -f /etc/debian_version ]; then
  echo "ERROR: this helper is intended to run inside Debian proot."
  echo "Run first: proot-distro login debian"
  exit 1
fi

if [ ! -x "$TUNNEL_CLIENT" ]; then
  echo "ERROR: tunnel-client not found or not executable at:"
  echo "$TUNNEL_CLIENT"
  exit 1
fi

if [ -z "${CONTROL_PLANE_API_KEY:-}" ]; then
  echo "CONTROL_PLANE_API_KEY is not set."
  echo "Paste the real OpenAI runtime API key for this tunnel."
  echo "Input is hidden. Nothing will be saved to repo."
  printf "OpenAI runtime API key: "
  stty -echo
  IFS= read -r CONTROL_PLANE_API_KEY
  stty echo
  echo
  export CONTROL_PLANE_API_KEY
fi

case "$CONTROL_PLANE_API_KEY" in
  ""|"PASTE_KEY_AWAK_DI_SINI"|"PASTE_RUNTIME_KEY_HERE")
    echo "ERROR: placeholder text detected. Paste the real OpenAI runtime API key."
    exit 1
    ;;
esac

echo "CONTROL_PLANE_API_KEY length: ${#CONTROL_PLANE_API_KEY}"
echo
echo "Running doctor..."
set +e
"$TUNNEL_CLIENT" doctor --profile "$PROFILE" --explain 2>&1 | tee "$DOCTOR_LOG"
doctor_status="${PIPESTATUS[0]}"
set -e

echo
if [ "$doctor_status" -eq 0 ]; then
  echo "Doctor: PASS"
else
  if grep -q 'FAILED_CHECKS oauth_metadata' "$DOCTOR_LOG" && ! grep -qi '401 Unauthorized\|controlplane.*401\|control_plane_api_key.*FAIL' "$DOCTOR_LOG"; then
    echo "Doctor: only oauth_metadata failed. Continuing for Phase 6 non-OAuth mode."
  else
    echo "Doctor failed with a blocker. Not starting tunnel-client."
    echo "Check CONTROL_PLANE_API_KEY, profile, and tunnel permission."
    exit "$doctor_status"
  fi
fi

echo
echo "Starting tunnel-client. Keep this terminal open."
echo "Press Ctrl+C to stop."
echo
exec "$TUNNEL_CLIENT" run --profile "$PROFILE"
