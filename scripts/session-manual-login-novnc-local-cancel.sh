#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROFILE="${1:-}"
STOP_NOVNC_AFTER_CANCEL="${SESSION_NOVNC_STOP_AFTER_CANCEL:-1}"
STOP_VNC_AFTER_CANCEL="${SESSION_VNC_STOP_AFTER_CANCEL:-0}"

usage() {
  echo "Usage: bash scripts/session-manual-login-novnc-local-cancel.sh <profile>" >&2
}

if [[ -z "$PROFILE" ]]; then
  usage
  exit 1
fi

if [[ ! "$PROFILE" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "FAIL: invalid profile name." >&2
  exit 1
fi

echo "== Phase 7M local noVNC-assisted manual login cancel =="
echo "profile: $PROFILE"
echo
echo "Cancelling pending manual login job. Secret values will not be printed."

bash scripts/session-manual-login-cancel.sh "$PROFILE" || true

if [[ "$STOP_NOVNC_AFTER_CANCEL" == "1" ]]; then
  echo
  echo "== Stop local noVNC gateway =="
  npm run session:novnc:stop:local || true
else
  echo
  echo "Local noVNC left running because SESSION_NOVNC_STOP_AFTER_CANCEL=$STOP_NOVNC_AFTER_CANCEL"
fi

if [[ "$STOP_VNC_AFTER_CANCEL" == "1" ]]; then
  echo
  echo "== Stop stable local VNC =="
  npm run session:vnc:stop:stable || true
else
  echo
  echo "Stable VNC left running. To stop it manually:"
  echo "  npm run session:vnc:stop:stable"
fi

echo

echo "PASS: local noVNC-assisted manual login job cancelled."
echo "Safety reminder: do not print passwords, cookies, tokens, MFA codes, or storageState JSON."
