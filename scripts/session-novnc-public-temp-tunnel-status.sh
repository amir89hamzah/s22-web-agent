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
  echo "--- log tail ---"
  tmux capture-pane -pt "$SESSION" -S -80 2>/dev/null | sed -E 's/(--token[= ]+)[^ ]+/\1<redacted>/g; s/(CLOUDFLARE_TUNNEL_TOKEN=)[^ ]+/\1<redacted>/g' || true
else
  echo "tmux: not running"
fi

echo
echo "== cloudflared process check =="
if pgrep -af cloudflared >/dev/null 2>&1; then
  pgrep -af cloudflared | sed -E 's/(--token[= ]+)[^ ]+/\1<redacted>/g; s/(CLOUDFLARE_TUNNEL_TOKEN=)[^ ]+/\1<redacted>/g'
else
  echo "no cloudflared process found"
fi

echo
echo "Safety reminder: process check redacts obvious token arguments, but do not share raw process listings while a tunnel is running."
