#!/usr/bin/env bash
set -euo pipefail

SESSION="${SESSION_NOVNC_TMUX:-s22-novnc-local}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux kill-session -t "$SESSION"
  echo "PASS: stopped local noVNC tmux session: $SESSION"
else
  echo "PASS: local noVNC tmux session not running: $SESSION"
fi
