#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"
TARGET_URL="${2:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Usage: npm run session:profile:status -- <profile> [target-url]" >&2
  exit 23
fi

cd "$REPO"
SESSION_REPO_ROOT="$REPO" node tools/session-profile-status.mjs "$PROFILE" "$TARGET_URL"
