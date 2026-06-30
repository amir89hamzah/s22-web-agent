#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"
URL="${2:-}"
EXPECTED_TEXT="${3:-}"
SUPPRESS_EXCERPT_VALUE="${SESSION_SCAN_SUPPRESS_EXCERPT:-0}"

if [[ -z "$PROFILE" || -z "$URL" ]]; then
  echo "Usage: bash scripts/session-profile-scan.sh <profile> <url> [expectedText]" >&2
  exit 1
fi

if [[ ! "$PROFILE" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "FAIL: invalid profile name." >&2
  exit 1
fi

if ! command -v proot-distro >/dev/null 2>&1; then
  echo "FAIL: proot-distro not found. Run this from Termux, not inside Debian." >&2
  exit 1
fi

cd "$REPO"

proot-distro login debian -- bash -lc '
  set -euo pipefail
  PROFILE="$1"
  URL="$2"
  EXPECTED_TEXT="$3"
  SUPPRESS_EXCERPT_VALUE="$4"

  cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent

  export CHROMIUM_EXECUTABLE="${CHROMIUM_EXECUTABLE:-/usr/bin/chromium}"
  export SESSION_SCAN_SUPPRESS_EXCERPT="$SUPPRESS_EXCERPT_VALUE"

  node tools/proot-playwright-worker/session-profile-scan.mjs "$PROFILE" "$URL" "$EXPECTED_TEXT"
' bash "$PROFILE" "$URL" "$EXPECTED_TEXT" "$SUPPRESS_EXCERPT_VALUE"
