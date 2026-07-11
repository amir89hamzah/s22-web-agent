#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_HOST="${1:-s22login.aidesk.rest}"
MCP_HOST="${MCP_PUBLIC_HOST:-s22agent.aidesk.rest}"
RUNTIME_DIR="$ROOT_DIR/.runtime"
TOKEN_ENV_FILE="$RUNTIME_DIR/cloudflared-public-temp.env"
TUNNEL_SESSION="${SESSION_PUBLIC_TUNNEL_TMUX:-s22-cloudflared-public-temp}"
HEADER_FILE="$(mktemp)"
trap 'rm -f "$HEADER_FILE"' EXIT

EXIT_ACTION_REQUIRED=21
EXIT_UNSAFE=23

unsafe=0
action_required=0
access_state="not_checked"
http_code="000"

if [[ ! "$PUBLIC_HOST" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]]; then
  echo "FAIL: public hostname is invalid." >&2
  exit "$EXIT_UNSAFE"
fi

if [[ "$PUBLIC_HOST" == "$MCP_HOST" ]]; then
  echo "FAIL: login hostname must be separate from the MCP hostname." >&2
  exit "$EXIT_UNSAFE"
fi

mkdir -p "$RUNTIME_DIR"
chmod 700 "$RUNTIME_DIR" 2>/dev/null || true

echo "== Phase 7Q-C0 Cloudflare security preflight =="
echo "login hostname: $PUBLIC_HOST"
echo "MCP hostname kept separate: $MCP_HOST"
echo
echo "This command does not start VNC, noVNC, cloudflared, a tunnel, or a public route."
echo

echo "== 1. Required local commands =="
for command_name in curl tmux cloudflared; do
  if command -v "$command_name" >/dev/null 2>&1; then
    echo "PASS: $command_name found"
  else
    echo "FAIL: $command_name not found"
    unsafe=1
  fi
done

echo
echo "== 2. Tunnel must be stopped during preflight =="
if tmux has-session -t "$TUNNEL_SESSION" 2>/dev/null; then
  echo "FAIL: public-temp tunnel tmux session is running: $TUNNEL_SESSION"
  unsafe=1
else
  echo "PASS: public-temp tunnel tmux session is not running"
fi

if pgrep -af cloudflared >/dev/null 2>&1; then
  echo "FAIL: a cloudflared process is currently running"
  echo "Check that this is not Route A or another intentional tunnel before stopping it."
  unsafe=1
else
  echo "PASS: no cloudflared process is running"
fi

echo
echo "== 3. Token hygiene =="
if [[ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  echo "ACTION REQUIRED: CLOUDFLARE_TUNNEL_TOKEN is exported in this shell."
  echo "Run locally: unset CLOUDFLARE_TUNNEL_TOKEN"
  action_required=1
else
  echo "PASS: CLOUDFLARE_TUNNEL_TOKEN is not exported in this shell"
fi

if [[ -e "$TOKEN_ENV_FILE" ]]; then
  echo "FAIL: temporary token file still exists under .runtime"
  echo "Stop the temporary tunnel helper before removing the file locally. Do not display its contents."
  unsafe=1
else
  echo "PASS: no temporary tunnel token file remains"
fi

echo
echo "== 4. Local noVNC should remain off =="
if curl -fsS --connect-timeout 2 --max-time 3 http://127.0.0.1:6080/ >/dev/null 2>&1; then
  echo "ACTION REQUIRED: local noVNC is reachable on 127.0.0.1:6080"
  echo "Stop it before completing the Cloudflare-only preflight."
  action_required=1
else
  echo "PASS: local noVNC is not reachable"
fi

echo
echo "== 5. Public Access front-door check =="
set +e
http_code="$(curl -sS --connect-timeout 10 --max-time 20 \
  -o /dev/null -D "$HEADER_FILE" -w '%{http_code}' \
  "https://${PUBLIC_HOST}/")"
curl_rc=$?
set -e

if [[ "$curl_rc" -ne 0 ]]; then
  http_code="000"
fi

if grep -qiE '^location: .*cloudflareaccess\.com|^location: .*/cdn-cgi/access/login' "$HEADER_FILE"; then
  access_state="access_challenge_detected"
  echo "PASS: Cloudflare Access login challenge detected"
elif [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
  access_state="protected_response_needs_browser_confirmation"
  echo "ACTION REQUIRED: protected HTTP response detected, but Access login redirect was not proven"
  echo "Confirm the Access application and exact-email Allow policy in the Cloudflare dashboard."
  action_required=1
elif [[ "$http_code" == "200" ]]; then
  access_state="public_content_reachable_without_access_challenge"
  echo "FAIL: the login hostname returned public content without an Access challenge"
  unsafe=1
else
  access_state="access_not_proven"
  echo "ACTION REQUIRED: Cloudflare Access protection was not proven from the public hostname"
  echo "HTTP status: $http_code"
  echo "This may mean DNS, the Access application, or the hostname is not currently configured."
  action_required=1
fi

echo
echo "== Result =="
echo "publicHost: $PUBLIC_HOST"
echo "accessState: $access_state"
echo "httpStatus: $http_code"
echo "publicGatewayStarted: false"
echo "tokenValuePrinted: false"
echo "next: rotate or recreate the historical tunnel token in Cloudflare, restrict Access to your exact email, keep the connector stopped, then rerun this preflight."

if [[ "$unsafe" -ne 0 ]]; then
  echo "PREFLIGHT RESULT: unsafe_or_incomplete"
  exit "$EXIT_UNSAFE"
fi

if [[ "$action_required" -ne 0 ]]; then
  echo "PREFLIGHT RESULT: operator_action_required"
  exit "$EXIT_ACTION_REQUIRED"
fi

echo "PREFLIGHT RESULT: local_safe_and_access_front_door_detected"
echo "PASS: Phase 7Q-C0 automated checks completed without starting any public service."
