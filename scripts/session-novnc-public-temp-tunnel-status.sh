#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SESSION="${SESSION_PUBLIC_TUNNEL_TMUX:-s22-cloudflared-public-temp}"

echo "== Phase 7N Cloudflare connector tmux status =="
echo "tmux session: $SESSION"
echo

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "tmux: running"
  echo
  echo "--- safe log summary ---"
  LOG_CAPTURE="$(tmux capture-pane -pt "$SESSION" -S -120 2>/dev/null || true)"
  if echo "$LOG_CAPTURE" | grep -q "Registered tunnel connection"; then
    echo "registered tunnel connection: yes"
  else
    echo "registered tunnel connection: not seen in recent log"
  fi
  if echo "$LOG_CAPTURE" | grep -q "Updated to new configuration"; then
    echo "configuration update received: yes"
  else
    echo "configuration update received: not seen in recent log"
  fi
  if echo "$LOG_CAPTURE" | grep -q "Environment is healthy"; then
    echo "cloudflared precheck: healthy"
  else
    echo "cloudflared precheck: not seen in recent log"
  fi
  if echo "$LOG_CAPTURE" | grep -qi "error\|fail"; then
    echo "recent error/fail lines detected; attach tmux locally to inspect. Do not share raw tunnel logs."
  fi
else
  echo "tmux: not running"
fi

echo
echo "== cloudflared process check =="
if pgrep -af cloudflared >/dev/null 2>&1; then
  echo "cloudflared process: running"
else
  echo "cloudflared process: not found"
fi

echo
echo "Safety reminder: this status helper intentionally does not print raw cloudflared logs because tunnel logs may include sensitive token material on some versions."
