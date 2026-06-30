#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"
URL="${2:-}"
DISPLAY_VALUE="${SESSION_LOGIN_DISPLAY:-:1}"

if [[ -z "$PROFILE" || -z "$URL" ]]; then
  echo "Usage: bash scripts/session-manual-login-start.sh <profile> <url>" >&2
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
mkdir -p .runtime/manual-login-jobs
LOG=".runtime/manual-login-jobs/${PROFILE}.log"
PIDFILE=".runtime/manual-login-jobs/${PROFILE}.pid"
STATE=".runtime/manual-login-jobs/${PROFILE}.json"
DONE=".runtime/manual-login-jobs/${PROFILE}.done"

if [[ -f "$PIDFILE" ]]; then
  OLD_PID="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "FAIL: manual login job already appears to be running for profile: $PROFILE"
    echo "pid: $OLD_PID"
    echo "Check: bash scripts/session-manual-login-status.sh $PROFILE"
    exit 1
  fi
fi

rm -f "$DONE"
: > "$LOG"

nohup proot-distro login debian -- bash -lc '
  set -euo pipefail
  LOGIN_PROFILE="$1"
  LOGIN_URL="$2"
  LOGIN_DISPLAY="$3"
  cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent
  export DISPLAY="$LOGIN_DISPLAY"
  export CHROMIUM_EXECUTABLE="${CHROMIUM_EXECUTABLE:-/usr/bin/chromium}"
  node tools/proot-playwright-worker/session-manual-login-worker.mjs "$LOGIN_PROFILE" "$LOGIN_URL"
' bash "$PROFILE" "$URL" "$DISPLAY_VALUE" >> "$LOG" 2>&1 &

PID="$!"
echo "$PID" > "$PIDFILE"

cat > "$STATE" <<EOF_STATE
{
  "ok": true,
  "status": "starting",
  "profile": "$PROFILE",
  "url": "$URL",
  "pid": "$PID",
  "display": "$DISPLAY_VALUE",
  "log": "$LOG",
  "instruction": "Open aVNC/noVNC and complete login manually. Then run: bash scripts/session-manual-login-complete.sh $PROFILE",
  "safety": "Do not paste password, cookie, token, or storageState into ChatGPT, shell, docs, or MCP arguments."
}
EOF_STATE

sleep 2

echo "Manual login job started."
echo "profile: $PROFILE"
echo "url: $URL"
echo "pid: $PID"
echo "display: $DISPLAY_VALUE"
echo "log: $LOG"
echo
echo "Next: open aVNC/noVNC, complete login manually, then run:"
echo "bash scripts/session-manual-login-complete.sh $PROFILE"
echo
echo "Current status:"
bash scripts/session-manual-login-status.sh "$PROFILE" || true
