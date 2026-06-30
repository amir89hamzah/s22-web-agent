#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Usage: bash scripts/session-manual-login-status.sh <profile>" >&2
  exit 1
fi

cd "$REPO"
STATE=".runtime/manual-login-jobs/${PROFILE}.json"
LOG=".runtime/manual-login-jobs/${PROFILE}.log"
PIDFILE=".runtime/manual-login-jobs/${PROFILE}.pid"

if [[ -f "$STATE" ]]; then
  echo "--- state ---"
  cat "$STATE"
else
  echo "No state file found for profile: $PROFILE"
fi

if [[ -f "$PIDFILE" ]]; then
  PID="$(cat "$PIDFILE" 2>/dev/null || true)"
  echo
  echo "--- process ---"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "running pid: $PID"
  else
    echo "not running pid: ${PID:-unknown}"
  fi
fi

if [[ -f "$LOG" ]]; then
  echo
  echo "--- log tail ---"
  tail -40 "$LOG"
fi
