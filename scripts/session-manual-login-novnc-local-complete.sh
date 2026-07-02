#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROFILE="${1:-}"
SCAN_URL="${2:-}"
EXPECTED_TEXT="${3:-}"
STOP_NOVNC_AFTER_COMPLETE="${SESSION_NOVNC_STOP_AFTER_COMPLETE:-1}"
STOP_VNC_AFTER_COMPLETE="${SESSION_VNC_STOP_AFTER_COMPLETE:-0}"

usage() {
  echo "Usage: bash scripts/session-manual-login-novnc-local-complete.sh <profile> [scan-url] [expected-text]" >&2
  echo "Example: SESSION_SCAN_SUPPRESS_EXCERPT=1 bash scripts/session-manual-login-novnc-local-complete.sh novnc-local-demo http://127.0.0.1:3107/secure 'S22 DEMO AUTH PASS'" >&2
}

if [[ -z "$PROFILE" ]]; then
  usage
  exit 1
fi

if [[ ! "$PROFILE" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "FAIL: invalid profile name." >&2
  exit 1
fi

if [[ -n "$SCAN_URL" ]]; then
  node -e '
    const raw = process.argv[1];
    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol)) process.exit(2);
    } catch {
      process.exit(2);
    }
  ' "$SCAN_URL" || {
    echo "FAIL: scan-url must be a valid http or https URL." >&2
    exit 1
  }
fi

STATE=".runtime/manual-login-jobs/${PROFILE}.json"

echo "== Phase 7M local noVNC-assisted manual login complete =="
echo "profile: $PROFILE"
echo
echo "Safety boundary:"
echo "- Completion only signals that the human user has finished login."
echo "- storageState is saved locally under .runtime/sessions/<profile>/ only."
echo "- Passwords, cookies, tokens, MFA codes, and storageState JSON are not printed."
echo

bash scripts/session-manual-login-complete.sh "$PROFILE"

if [[ ! -f "$STATE" ]] || ! grep -q '"status": "completed"' "$STATE"; then
  echo
  echo "FAIL: manual login job has not reported completed yet." >&2
  echo "Do not stop the local noVNC login path until storageState has been saved or you intentionally cancel." >&2
  echo "Check status: bash scripts/session-manual-login-novnc-local-status.sh $PROFILE" >&2
  exit 1
fi

echo

echo "PASS: manual login job completed and local profile was saved."

if [[ "$STOP_NOVNC_AFTER_COMPLETE" == "1" ]]; then
  echo
  echo "== Stop local noVNC gateway =="
  npm run session:novnc:stop:local || true
else
  echo
  echo "Local noVNC left running because SESSION_NOVNC_STOP_AFTER_COMPLETE=$STOP_NOVNC_AFTER_COMPLETE"
fi

if [[ "$STOP_VNC_AFTER_COMPLETE" == "1" ]]; then
  echo
  echo "== Stop stable local VNC =="
  npm run session:vnc:stop:stable || true
else
  echo
  echo "Stable VNC left running. To stop it manually:"
  echo "  npm run session:vnc:stop:stable"
fi

if [[ -n "$SCAN_URL" ]]; then
  echo
  echo "== Optional authenticated profile scan with text excerpt suppression =="
  SESSION_SCAN_SUPPRESS_EXCERPT=1 bash scripts/session-profile-scan.sh "$PROFILE" "$SCAN_URL" "$EXPECTED_TEXT"
else
  echo
  echo "No scan URL provided. To reuse this profile later:"
  echo "  SESSION_SCAN_SUPPRESS_EXCERPT=1 bash scripts/session-profile-scan.sh $PROFILE <scan-url> '<expected text>'"
fi

echo

echo "Final safety reminder: do not commit or print .runtime/sessions/<profile>/storageState.json."
