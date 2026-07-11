#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

INTERVAL="${RUNTIME_WATCH_INTERVAL:-5}"
LOG_DIR=".runtime/diagnostics"
LOG_FILE="$LOG_DIR/runtime-watch.log"
MAX_BYTES="${RUNTIME_WATCH_MAX_BYTES:-2097152}"

if [[ ! "$INTERVAL" =~ ^[0-9]+$ ]] || (( INTERVAL < 2 || INTERVAL > 60 )); then
  echo "FAIL: RUNTIME_WATCH_INTERVAL must be an integer from 2 to 60 seconds." >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

count_processes() {
  local pattern="$1"
  local count
  count="$(pgrep -c -f "$pattern" 2>/dev/null || true)"
  printf '%s' "${count:-0}"
}

rotate_if_needed() {
  local size=0
  if [[ -f "$LOG_FILE" ]]; then
    size="$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)"
  fi
  if (( size > MAX_BYTES )); then
    mv "$LOG_FILE" "$LOG_DIR/runtime-watch.previous.log"
    : > "$LOG_FILE"
    echo "rotatedAt=$(date -Is 2>/dev/null || date)" >> "$LOG_FILE"
  fi
}

snapshot() {
  rotate_if_needed
  {
    echo "---"
    echo "time=$(date -Is 2>/dev/null || date)"
    awk '
      /^MemTotal:/ {mt=$2}
      /^MemAvailable:/ {ma=$2}
      /^SwapTotal:/ {st=$2}
      /^SwapFree:/ {sf=$2}
      END {printf "memTotalKiB=%s memAvailableKiB=%s swapTotalKiB=%s swapUsedKiB=%s\n", mt, ma, st, (st-sf)}
    ' /proc/meminfo 2>/dev/null || true

    if [[ -r /proc/pressure/memory ]]; then
      tr '\n' ' ' < /proc/pressure/memory 2>/dev/null | sed 's/[[:space:]]\+$//' | sed 's/^/memoryPressure=/' || true
      echo
    fi

    printf 'counts cloudflared=%s chromium=%s proot=%s Xtigervnc=%s websockify=%s node=%s sshd=%s\n' \
      "$(count_processes '[c]loudflared')" \
      "$(count_processes '[c]hromium')" \
      "$(count_processes '[p]root')" \
      "$(count_processes '[X]tigervnc')" \
      "$(count_processes '[w]ebsockify')" \
      "$(count_processes '[n]ode')" \
      "$(count_processes '[s]shd')"

    echo "topRssKiB pid ppid stat command"
    if ps -A -o pid=,ppid=,stat=,rss=,comm= >/dev/null 2>&1; then
      ps -A -o pid=,ppid=,stat=,rss=,comm= 2>/dev/null \
        | sort -k4,4nr \
        | head -n 10 \
        | awk '{printf "%s %s %s %s %s\n", $4, $1, $2, $3, $5}'
    else
      echo "unavailable"
    fi
  } >> "$LOG_FILE"
}

trap 'echo "watchStoppedAt=$(date -Is 2>/dev/null || date)" >> "$LOG_FILE"' EXIT INT TERM

echo "watchStartedAt=$(date -Is 2>/dev/null || date) intervalSeconds=$INTERVAL" >> "$LOG_FILE"

while true; do
  snapshot
  sleep "$INTERVAL"
done
