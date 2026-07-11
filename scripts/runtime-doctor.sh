#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

count_processes() {
  local pattern="$1"
  local count
  count="$(pgrep -c -f "$pattern" 2>/dev/null || true)"
  printf '%s' "${count:-0}"
}

pid_file_state() {
  local label="$1"
  local file="$2"
  if [[ ! -f "$file" ]]; then
    printf '%-18s %s\n' "$label" "no pid file"
    return
  fi

  local pid
  pid="$(cat "$file" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    printf '%-18s running pid %s\n' "$label" "$pid"
  else
    printf '%-18s stale pid file%s\n' "$label" "${pid:+ ($pid)}"
  fi
}

echo "== S22 runtime doctor =="
echo "time: $(date -Is 2>/dev/null || date)"
echo "repo: $(pwd)"
echo

echo "== Memory =="
free -h 2>/dev/null || true

echo
echo "== Selected /proc/meminfo =="
grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree|Cached|Buffers):' /proc/meminfo 2>/dev/null || true

if [[ -r /proc/pressure/memory ]]; then
  echo
  echo "== Memory pressure =="
  cat /proc/pressure/memory 2>/dev/null || true
fi

echo
echo "== Project process counts =="
printf '%-14s %s\n' "cloudflared" "$(count_processes '[c]loudflared')"
printf '%-14s %s\n' "chromium" "$(count_processes '[c]hromium')"
printf '%-14s %s\n' "proot" "$(count_processes '[p]root')"
printf '%-14s %s\n' "Xtigervnc" "$(count_processes '[X]tigervnc')"
printf '%-14s %s\n' "websockify" "$(count_processes '[w]ebsockify')"
printf '%-14s %s\n' "node" "$(count_processes '[n]ode')"
printf '%-14s %s\n' "sshd" "$(count_processes '[s]shd')"

echo
echo "== Known service pid files =="
pid_file_state "API 3001" ".runtime/api.pid"
pid_file_state "MCP HTTP 3003" ".runtime/mcp-http.pid"

echo
echo "== tmux sessions =="
tmux list-sessions -F '#S' 2>/dev/null || echo "none"

echo
echo "== Top visible processes by resident memory =="
echo "PID      PPID     STAT     RSS_KiB  COMMAND"
if ps -A -o pid=,ppid=,stat=,rss=,comm= >/dev/null 2>&1; then
  ps -A -o pid=,ppid=,stat=,rss=,comm= 2>/dev/null \
    | sort -k4,4nr \
    | head -n 15 \
    | awk '{printf "%-8s %-8s %-8s %-8s %s\n", $1, $2, $3, $4, $5}'
else
  echo "process RSS listing unavailable in this Android/Termux context"
fi

echo
echo "== Repository filesystem =="
df -h . 2>/dev/null | sed -n '1,2p' || true

echo
echo "Safety: command lines, environment values, tokens, cookies, credentials, and storageState contents were not printed."
