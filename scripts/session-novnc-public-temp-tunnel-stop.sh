#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SESSION="${SESSION_PUBLIC_TUNNEL_TMUX:-s22-cloudflared-public-temp}"
FORCE_STOP="${FORCE_STOP_CLOUDFLARED:-0}"

echo "== Phase 7N Cloudflare connector tmux stop =="
echo "tmux session: $SESSION"
echo

rm -f .runtime/cloudflared-public-temp.env .runtime/cloudflared-public-temp-runner.sh 2>/dev/null || true

if tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux kill-session -t "$SESSION" || true
  echo "PASS: stopped tmux session: $SESSION"
else
  echo "PASS: tmux session not running: $SESSION"
fi

if [[ "$FORCE_STOP" == "1" ]]; then
  echo
  echo "FORCE_STOP_CLOUDFLARED=1 set. Attempting to stop any remaining cloudflared process."
  pkill -f cloudflared 2>/dev/null || true
else
  echo
  echo "No global pkill was run."
  echo "If an old foreground cloudflared is still running and you intentionally want to stop all cloudflared processes:"
  echo "  FORCE_STOP_CLOUDFLARED=1 npm run session:novnc:public-temp:tunnel:stop"
fi

echo
echo "Safety reminder: this helper does not remove Cloudflare Dashboard routes."
echo "After Phase 7N proof, remove/disable temporary route if no longer needed:"
echo "  s22login.aidesk.rest -> http://127.0.0.1:6080"
