#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TUNNEL_SESSION="${OPENAI_TUNNEL_TMUX_SESSION:-s22openai}"
WORKER_SESSION="s22worker"
VNC_SESSION="s22vnc"
NOVNC_SESSION="${SESSION_NOVNC_TMUX:-s22-novnc-local}"
PUBLIC_TUNNEL_SESSION="${SESSION_PUBLIC_TUNNEL_TMUX:-s22-cloudflared-public-temp}"
PROFILE="${OPENAI_TUNNEL_PROFILE:-s22-web-agent-local}"

cd "$ROOT_DIR"

is_http_ready() {
  curl -fsS --max-time 2 "$1" >/dev/null 2>&1
}

has_tmux() {
  tmux has-session -t "$1" 2>/dev/null
}

api="off"
mcp="off"
tunnel_tmux="off"
tunnel_process="off"
worker="off"
vnc="off"
novnc="off"
public_tunnel="off"

is_http_ready "http://127.0.0.1:3001/health" && api="ready"
is_http_ready "http://127.0.0.1:3003/health" && mcp="ready"
is_http_ready "http://127.0.0.1:3002/health" && worker="ready"

has_tmux "$TUNNEL_SESSION" && tunnel_tmux="running"
has_tmux "$WORKER_SESSION" && worker="ready"
has_tmux "$VNC_SESSION" && vnc="running"
has_tmux "$NOVNC_SESSION" && novnc="running"
has_tmux "$PUBLIC_TUNNEL_SESSION" && public_tunnel="running"

pgrep -af "tunnel-client.*${PROFILE}" >/dev/null 2>&1 &&
  tunnel_process="running"

ss -ltn 2>/dev/null | grep -Eq '127\.0\.0\.1:5901|0\.0\.0\.0:5901' &&
  vnc="running"

ss -ltn 2>/dev/null | grep -Eq '127\.0\.0\.1:6080|0\.0\.0\.0:6080' &&
  novnc="running"

if [ "$api" = "ready" ] &&
   [ "$mcp" = "ready" ] &&
   [ "$tunnel_tmux" = "running" ] &&
   [ "$tunnel_process" = "running" ]; then
  overall="READY"
elif [ "$api" = "off" ] &&
     [ "$mcp" = "off" ] &&
     [ "$tunnel_tmux" = "off" ] &&
     [ "$tunnel_process" = "off" ] &&
     [ "$worker" = "off" ] &&
     [ "$vnc" = "off" ] &&
     [ "$novnc" = "off" ] &&
     [ "$public_tunnel" = "off" ]; then
  overall="STOPPED"
else
  overall="DEGRADED"
fi

echo "== S22 Web Agent status =="
echo "Overall:          $overall"
echo
echo "API 3001:         $api"
echo "MCP 3003:         $mcp"
echo "OpenAI tmux:      $tunnel_tmux"
echo "Tunnel process:   $tunnel_process"
echo
echo "Browser worker:   $worker"
echo "VNC 5901:         $vnc"
echo "noVNC 6080:       $novnc"
echo "Public tunnel:    $public_tunnel"
