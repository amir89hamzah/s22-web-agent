#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROFILE="${1:-}"
STOP_NOVNC_AFTER_CANCEL="${SESSION_NOVNC_STOP_AFTER_CANCEL:-1}"
STOP_VNC_AFTER_CANCEL="${SESSION_VNC_STOP_AFTER_CANCEL:-0}"

usage() {
  echo "Usage: bash scripts/session-manual-login-novnc-local-cancel.sh <profile>" >&2
}

kill_profile_manual_login_processes() {
  local found=0

  echo
  echo "== Stop stale manual-login worker processes for profile, if any =="

  while IFS= read -r line; do
    local pid cmd
    pid="${line%% *}"
    cmd="${line#* }"

    case "$cmd" in
      *session-manual-login-worker.mjs*"$PROFILE"*|*proot*session-manual-login-worker.mjs*"$PROFILE"*)
        if [[ "$pid" != "$$" ]]; then
          found=1
          echo "stopping pid: $pid"
          kill "$pid" 2>/dev/null || true
        fi
        ;;
    esac
  done < <(pgrep -af "$PROFILE" 2>/dev/null || true)

  sleep 1

  while IFS= read -r line; do
    local pid cmd
    pid="${line%% *}"
    cmd="${line#* }"

    case "$cmd" in
      *session-manual-login-worker.mjs*"$PROFILE"*|*proot*session-manual-login-worker.mjs*"$PROFILE"*)
        if [[ "$pid" != "$$" ]]; then
          found=1
          echo "force stopping pid: $pid"
          kill -9 "$pid" 2>/dev/null || true
        fi
        ;;
    esac
  done < <(pgrep -af "$PROFILE" 2>/dev/null || true)

  if [[ "$found" == "0" ]]; then
    echo "no stale manual-login worker process found for profile: $PROFILE"
  fi
}

if [[ -z "$PROFILE" ]]; then
  usage
  exit 1
fi

if [[ ! "$PROFILE" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "FAIL: invalid profile name." >&2
  exit 1
fi

PIDFILE=".runtime/manual-login-jobs/${PROFILE}.pid"
DONE=".runtime/manual-login-jobs/${PROFILE}.done"

echo "== Phase 7M local noVNC-assisted manual login cancel =="
echo "profile: $PROFILE"
echo
echo "Cancelling pending manual login job. Secret values will not be printed."

bash scripts/session-manual-login-cancel.sh "$PROFILE" || true
kill_profile_manual_login_processes
rm -f "$PIDFILE" "$DONE"

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

echo "PASS: local noVNC-assisted manual login job cancelled and stale profile worker cleanup attempted."
echo "Safety reminder: do not print passwords, cookies, tokens, MFA codes, or storageState JSON."
