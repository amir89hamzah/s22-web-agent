#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_HOST="${1:-s22login.aidesk.rest}"
MCP_HOST="${MCP_PUBLIC_HOST:-s22agent.aidesk.rest}"
TUNNEL_MODE="${AUTH_GATEWAY_TUNNEL_MODE:-shared}"
RUNTIME_DIR="$ROOT_DIR/.runtime"
TOKEN_ENV_FILE="$RUNTIME_DIR/cloudflared-public-temp.env"
TEMP_TUNNEL_SESSION="${SESSION_PUBLIC_TUNNEL_TMUX:-s22-cloudflared-public-temp}"
HEADER_FILE="$(mktemp)"
trap 'rm -f "$HEADER_FILE"' EXIT

EXIT_ACTION_REQUIRED=21
EXIT_UNSAFE=23

unsafe=0
action_required=0
access_state="not_checked"
http_code="000"
shared_connector_running="false"

if [[ ! "$PUBLIC_HOST" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]]; then
  echo "FAIL: public hostname is invalid." >&2
  exit "$EXIT_UNSAFE"
fi

if [[ "$PUBLIC_HOST" == "$MCP_HOST" ]]; then
  echo "FAIL: login hostname must be separate from the MCP hostname." >&2
  exit "$EXIT_UNSAFE"
fi

if [[ "$TUNNEL_MODE" != "shared" && "$TUNNEL_MODE" != "dedicated" ]]; then
  echo "FAIL: AUTH_GATEWAY_TUNNEL_MODE must be shared or dedicated." >&2
  exit "$EXIT_UNSAFE"
fi

mkdir -p "$RUNTIME_DIR"
chmod 700 "$RUNTIME_DIR" 2>/dev/null || true

echo "== Phase 7Q-C0 Cloudflare security preflight =="
echo "login hostname: $PUBLIC_HOST"
echo "MCP hostname kept separate: $MCP_HOST"
echo "tunnel mode: $TUNNEL_MODE"
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
echo "== 2. Tunnel architecture check =="
if tmux has-session -t "$TEMP_TUNNEL_SESSION" 2>/dev/null; then
  echo "FAIL: legacy public-temp tunnel tmux session is running: $TEMP_TUNNEL_SESSION"
  echo "The current architecture uses the existing shared tunnel; do not start a second connector."
  unsafe=1
else
  echo "PASS: no legacy public-temp tunnel tmux session is running"
fi

if pgrep -f '[c]loudflared' >/dev/null 2>&1; then
  shared_connector_running="true"
  if [[ "$TUNNEL_MODE" == "shared" ]]; then
    echo "PASS: a cloudflared connector is running and is allowed in shared mode"
    echo "Safety: this helper does not display the cloudflared command line or token."
  else
    echo "ACTION REQUIRED: cloudflared is running while dedicated-mode preflight expects the connector stopped"
    action_required=1
  fi
else
  if [[ "$TUNNEL_MODE" == "shared" ]]; then
    echo "INFO: no cloudflared connector is currently running"
    echo "The Access front door can still be checked without starting the connector."
  else
    echo "PASS: no cloudflared connector is running"
  fi
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
  echo "Do not display its contents. Remove it only after confirming no helper depends on it."
  unsafe=1
else
  echo "PASS: no temporary tunnel token file remains"
fi

echo
echo "== 4. Local login gateway should remain off while idle =="
if curl -fsS --connect-timeout 2 --max-time 3 http://127.0.0.1:6080/ >/dev/null 2>&1; then
  echo "ACTION REQUIRED: local noVNC is reachable on 127.0.0.1:6080"
  echo "Stop noVNC before completing the idle-state security preflight."
  action_required=1
else
  echo "PASS: local noVNC is not reachable"
fi

if pgrep -f '[X]tigervnc|[X]vnc|[v]ncserver' >/dev/null 2>&1; then
  echo "ACTION REQUIRED: a VNC process appears to be running"
  echo "Stop the login display before completing the idle-state security preflight."
  action_required=1
else
  echo "PASS: no VNC process detected"
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
echo "mcpHost: $MCP_HOST"
echo "tunnelMode: $TUNNEL_MODE"
echo "sharedConnectorRunning: $shared_connector_running"
echo "accessState: $access_state"
echo "httpStatus: $http_code"
echo "publicGatewayStarted: false"
echo "tokenValuePrinted: false"
echo "next: keep the shared MCP tunnel architecture, keep noVNC/VNC off while idle, and rotate the historical shared tunnel token in a controlled maintenance step before the public login proof."

if [[ "$unsafe" -ne 0 ]]; then
  echo "PREFLIGHT RESULT: unsafe_or_incomplete"
  exit "$EXIT_UNSAFE"
fi

if [[ "$action_required" -ne 0 ]]; then
  echo "PREFLIGHT RESULT: operator_action_required"
  exit "$EXIT_ACTION_REQUIRED"
fi

echo "PREFLIGHT RESULT: shared_tunnel_local_safe_and_access_front_door_detected"
echo "PASS: Phase 7Q-C0 automated checks completed without starting any public service."