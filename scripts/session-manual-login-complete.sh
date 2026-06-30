#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"
WAIT_SECONDS="${SESSION_LOGIN_COMPLETE_WAIT_SECONDS:-30}"

if [[ -z "$PROFILE" ]]; then
  echo "Usage: bash scripts/session-manual-login-complete.sh <profile>" >&2
  exit 1
fi

cd "$REPO"
mkdir -p .runtime/manual-login-jobs
DONE=".runtime/manual-login-jobs/${PROFILE}.done"
STATE=".runtime/manual-login-jobs/${PROFILE}.json"

echo "manual login completed by user at $(date -Is)" > "$DONE"
echo "Completion signal written for profile: $PROFILE"

for i in $(seq 1 "$WAIT_SECONDS"); do
  if [[ -f "$STATE" ]] && grep -q '"status": "completed"' "$STATE"; then
    echo "PASS: manual login job completed."
    bash scripts/session-manual-login-status.sh "$PROFILE" || true
    exit 0
  fi
  if [[ -f "$STATE" ]] && grep -Eq '"status": "(failed|timeout)"' "$STATE"; then
    echo "FAIL: manual login job ended unsuccessfully."
    bash scripts/session-manual-login-status.sh "$PROFILE" || true
    exit 1
  fi
  sleep 1
done

echo "WARN: completion signal sent, but job has not reported completed yet."
echo "Check status: bash scripts/session-manual-login-status.sh $PROFILE"
bash scripts/session-manual-login-status.sh "$PROFILE" || true
