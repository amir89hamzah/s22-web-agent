#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"

if ! command -v proot-distro >/dev/null 2>&1; then
  echo "FAIL: proot-distro not found. Run this wrapper from Termux, not inside Debian." >&2
  exit 1
fi

if [[ ! -d "$REPO/.git" ]]; then
  echo "FAIL: repo not found at $REPO" >&2
  exit 1
fi

proot-distro login debian -- bash -lc '
set -euo pipefail
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
node tools/proot-playwright-worker/session-profile-scan.mjs "$@"
' -- "$@"
