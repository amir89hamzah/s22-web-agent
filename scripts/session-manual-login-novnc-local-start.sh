#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROFILE="${1:-}"
URL="${2:-}"

usage() {
  echo "Usage: bash scripts/session-manual-login-novnc-local-start.sh <profile> <url>" >&2
  echo "Example: bash scripts/session-manual-login-novnc-local-start.sh novnc-local-demo http://127.0.0.1:3107/login" >&2
}

check_local_listener_safety() {
  if ! command -v ss >/dev/null 2>&1; then
    echo "WARN: ss command not found; cannot inspect listening ports from Termux."
    return 0
  fi

  local listeners
  listeners="$(ss -ltn 2>/dev/null || true)"

  if echo "$listeners" | grep -E '0\.0\.0\.0:(5901|6080)|\[::\]:(5901|6080)|\*:(5901|6080)' >/dev/null 2>&1; then
    echo "FAIL: VNC/noVNC appears to be listening on a non-local interface." >&2
    echo "Safety rule: 5901 and 6080 must remain local-only in Phase 7M." >&2
    echo "$listeners" | grep -E ':(5901|6080)' || true
    exit 2
  fi
}

if [[ -z "$PROFILE" || -z "$URL" ]]; then
  usage
  exit 1
fi

if [[ ! "$PROFILE" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "FAIL: invalid profile name." >&2
  echo "Use only letters, numbers, dot, underscore, and dash; max 64 chars; first char must be alphanumeric." >&2
  exit 1
fi

node -e '
  const raw = process.argv[1];
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) process.exit(2);
  } catch {
    process.exit(2);
  }
' "$URL" || {
  echo "FAIL: url must be a valid http or https URL." >&2
  exit 1
}

command -v npm >/dev/null 2>&1 || { echo "FAIL: npm not found." >&2; exit 1; }
command -v tmux >/dev/null 2>&1 || { echo "FAIL: tmux not found. Run: pkg install -y tmux" >&2; exit 1; }
command -v proot-distro >/dev/null 2>&1 || { echo "FAIL: proot-distro not found. Run this from Termux, not inside Debian." >&2; exit 1; }

echo "== Phase 7M local noVNC-assisted manual login start =="
echo "profile: $PROFILE"
echo "url: $URL"
echo
echo "Safety boundary:"
echo "- No public tunnel will be started."
echo "- Raw VNC 5901 must remain local-only."
echo "- noVNC 6080 must remain local-only for Phase 7M."
echo "- API 3001 and Playwright worker 3002 are not exposed by this wrapper."
echo "- Do not paste passwords, cookies, tokens, MFA codes, or storageState into ChatGPT or shell output."
echo
echo "Note: starting stable VNC may restart the local Debian desktop and close old Chromium windows."
echo

echo "== Start stable local VNC =="
npm run session:vnc:start:stable

echo

echo "== Start local noVNC gateway =="
npm run session:novnc:start:local

check_local_listener_safety

echo

echo "== Start pending manual login job =="
bash scripts/session-manual-login-start.sh "$PROFILE" "$URL"

check_local_listener_safety

echo

echo "== Open noVNC locally =="
echo "S22 browser URL:"
echo "  http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080"
echo
echo "Windows PC access through SSH local forward:"
echo "  ssh -N -L 6080:127.0.0.1:6080 -p 8022 <termux-user>@<s22-ip>"
echo
echo "Then open on Windows browser:"
echo "  http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080"
echo
echo "After manual login succeeds, complete the job with:"
echo "  bash scripts/session-manual-login-novnc-local-complete.sh $PROFILE"
echo
echo "Optional: complete and immediately run a suppressed profile scan:"
echo "  SESSION_SCAN_SUPPRESS_EXCERPT=1 bash scripts/session-manual-login-novnc-local-complete.sh $PROFILE <scan-url> '<expected text>'"
echo
echo "PASS: local noVNC-assisted manual login job is ready for human login."
