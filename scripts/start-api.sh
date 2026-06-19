#!/data/data/com.termux/files/usr/bin/bash

set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$APP_DIR/.runtime"
LOG_FILE="$APP_DIR/server.log"
PID_FILE="$RUNTIME_DIR/api.pid"
PORT="${PORT:-3001}"

mkdir -p "$RUNTIME_DIR"

cd "$APP_DIR"

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "API server already running"
    echo "PID: $OLD_PID"
    echo "Port: $PORT"
    echo "Log: $LOG_FILE"
    exit 0
  else
    echo "Removing stale PID file"
    rm -f "$PID_FILE"
  fi
fi

echo "Starting API server on port $PORT..."
nohup npm run server > "$LOG_FILE" 2>&1 &
NEW_PID="$!"

echo "$NEW_PID" > "$PID_FILE"

sleep 2

if kill -0 "$NEW_PID" 2>/dev/null; then
  echo "API server started"
  echo "PID: $NEW_PID"
  echo "Port: $PORT"
  echo "Log: $LOG_FILE"
else
  echo "API server failed to start"
  echo "Check log: $LOG_FILE"
  exit 1
fi
