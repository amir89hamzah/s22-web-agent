#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Usage: bash scripts/session-manual-login-cancel.sh <profile>" >&2
  exit 1
fi

cd "$REPO"
PIDFILE=".runtime/manual-login-jobs/${PROFILE}.pid"
STATE=".runtime/manual-login-jobs/${PROFILE}.json"

if [[ -f "$PIDFILE" ]]; then
  PID="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    sleep 1
  fi
fi

cat > "$STATE" <<EOF_STATE
{
  "ok": false,
  "status": "cancelled",
  "profile": "$PROFILE",
  "cancelledAt": "$(date -Is)",
  "safety": "Manual login job was cancelled. Secret values were not printed."
}
EOF_STATE

echo "Cancelled manual login job for profile: $PROFILE"
