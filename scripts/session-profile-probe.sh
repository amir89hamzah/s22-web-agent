#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"
TARGET_URL="${2:-}"
EXPECTED_TEXT="${3:-}"

if [[ -z "$PROFILE" || -z "$TARGET_URL" || -z "$EXPECTED_TEXT" ]]; then
  echo "Usage: npm run session:profile:probe -- <profile> <url> <expected-text>" >&2
  exit 23
fi

if ! command -v proot-distro >/dev/null 2>&1; then
  echo "state: runtime_error" >&2
  echo "reason: proot_distro_missing" >&2
  echo "message: run this command from Termux with proot-distro installed" >&2
  echo "No cookie/session/token/password/MFA/storageState values were printed." >&2
  exit 23
fi

cd "$REPO"

proot-distro login debian -- bash -lc '
  set -euo pipefail

  PROFILE="$1"
  TARGET_URL="$2"
  EXPECTED_TEXT="$3"

  cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
  export SESSION_REPO_ROOT="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
  export CHROMIUM_EXECUTABLE="${CHROMIUM_EXECUTABLE:-/usr/bin/chromium}"

  node tools/proot-playwright-worker/session-profile-probe.mjs "$PROFILE" "$TARGET_URL" "$EXPECTED_TEXT"
' bash "$PROFILE" "$TARGET_URL" "$EXPECTED_TEXT"
