#!/data/data/com.termux/files/usr/bin/bash

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$APP_DIR/.runtime"
PID_FILE="$RUNTIME_DIR/api.pid"
LOG_FILE="$APP_DIR/server.log"
PORT="${PORT:-3001}"
HEALTH_URL="http://127.0.0.1:$PORT/health"

echo "API status check"
echo "Port: $PORT"
echo "Health URL: $HEALTH_URL"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    echo "Process: running"
    echo "PID: $PID"
  else
    echo "Process: not running, stale PID file exists"
  fi
else
  echo "Process: no PID file"
fi

if command -v curl >/dev/null 2>&1; then
  echo
  echo "Health response:"
  curl -s "$HEALTH_URL" || true
  echo
else
  echo "curl not found, skipping health check"
fi

echo
echo "Log file: $LOG_FILE"
