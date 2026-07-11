#!/usr/bin/env bash
set -uo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
PROFILE="${1:-}"
TARGET_URL="${2:-}"
EXPECTED_TEXT="${3:-}"
LOGIN_URL="${4:-}"

STATE_MISSING=20
STATE_EXPIRED=21
STATE_DOMAIN_MISMATCH=22
STATE_RUNTIME_ERROR=23

usage() {
  echo "Usage: npm run session:profile:ensure -- <profile> <authenticated-url> <expected-text> [login-url]" >&2
}

print_refresh_guidance() {
  echo
  echo "Safe manual-login refresh guidance:"
  echo "  1. Start a local human-controlled login:"
  if [[ -n "$LOGIN_URL" ]]; then
    printf '     SESSION_LOGIN_TIMEOUT_MS=1200000 npm run session:manual-login:novnc:start -- %q %q\n' "$PROFILE" "$LOGIN_URL"
  else
    printf '     SESSION_LOGIN_TIMEOUT_MS=1200000 npm run session:manual-login:novnc:start -- %q <login-url>\n' "$PROFILE"
  fi
  echo "  2. Complete login manually in local VNC/noVNC."
  echo "  3. Save and verify the refreshed profile:"
  printf '     SESSION_SCAN_SUPPRESS_EXCERPT=1 npm run session:manual-login:novnc:complete -- %q %q %q\n' "$PROFILE" "$TARGET_URL" "$EXPECTED_TEXT"
  echo
  echo "This helper did not start VNC, noVNC, Cloudflare, or any public route."
  echo "Public noVNC must remain temporary and intentionally started only."
}

if [[ -z "$PROFILE" || -z "$TARGET_URL" || -z "$EXPECTED_TEXT" ]]; then
  usage
  exit "$STATE_RUNTIME_ERROR"
fi

cd "$REPO"

echo "== Profile ensure: local status =="
set +e
bash scripts/session-profile-status.sh "$PROFILE" "$TARGET_URL"
STATUS_RC=$?
set -e

case "$STATUS_RC" in
  0)
    ;;
  "$STATE_MISSING")
    print_refresh_guidance
    exit "$STATE_MISSING"
    ;;
  "$STATE_DOMAIN_MISMATCH")
    echo
    echo "No refresh command was started."
    echo "Use a separate profile captured for the target domain or choose the correct existing profile."
    echo "This helper did not start VNC, noVNC, Cloudflare, or any public route."
    exit "$STATE_DOMAIN_MISMATCH"
    ;;
  *)
    echo
    echo "Profile status could not be verified safely."
    echo "This helper did not start VNC, noVNC, Cloudflare, or any public route."
    exit "$STATE_RUNTIME_ERROR"
    ;;
esac

echo
echo "== Profile ensure: live authenticated probe =="
set +e
bash scripts/session-profile-probe.sh "$PROFILE" "$TARGET_URL" "$EXPECTED_TEXT"
PROBE_RC=$?
set -e

case "$PROBE_RC" in
  0)
    echo
    echo "ENSURE RESULT: valid"
    echo "The saved profile is ready for reuse."
    echo "This helper did not start VNC, noVNC, Cloudflare, or any public route."
    exit 0
    ;;
  "$STATE_MISSING"|"$STATE_EXPIRED")
    print_refresh_guidance
    exit "$PROBE_RC"
    ;;
  "$STATE_DOMAIN_MISMATCH")
    echo
    echo "ENSURE RESULT: domain_mismatch"
    echo "Use a profile captured for the target domain."
    echo "This helper did not start VNC, noVNC, Cloudflare, or any public route."
    exit "$STATE_DOMAIN_MISMATCH"
    ;;
  *)
    echo
    echo "ENSURE RESULT: runtime_error"
    echo "The live probe failed before validity could be confirmed."
    echo "This helper did not start VNC, noVNC, Cloudflare, or any public route."
    exit "$STATE_RUNTIME_ERROR"
    ;;
esac
