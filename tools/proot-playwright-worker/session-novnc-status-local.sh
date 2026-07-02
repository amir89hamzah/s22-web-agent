#!/usr/bin/env bash
set -euo pipefail

SESSION="${SESSION_NOVNC_TMUX:-s22-novnc-local}"

echo "tmux session:"
if tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux list-sessions | grep "$SESSION" || true
  echo
  echo "Recent noVNC log:"
  tmux capture-pane -pt "$SESSION" -S -60 || true
else
  echo "not running: $SESSION"
fi

echo
echo "Listening ports:"
ss -ltnp | grep -E '(:5901|:6080)' || true

echo
echo "Safety expectation:"
echo "- 5901 should not be public."
echo "- 6080 should be 127.0.0.1:6080 for Phase 7K."
