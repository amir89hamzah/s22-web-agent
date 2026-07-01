#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
SESSION_NAME="s22vnc"

echo "== Stable VNC stop =="
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

npm run session:vnc:stop || true

pkill -f Xtigervnc 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
pkill -f openbox 2>/dev/null || true
pkill -f xterm 2>/dev/null || true

npm run session:vnc:status || true
