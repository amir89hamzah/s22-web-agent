#!/data/data/com.termux/files/usr/bin/bash

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$APP_DIR/.runtime"
PID_FILE="$RUNTIME_DIR/mcp-http.pid"
LOG_FILE="$RUNTIME_DIR/mcp-http.log"
PORT="${MCP_HTTP_PORT:-3003}"
MCP_PATH="${MCP_HTTP_PATH:-/mcp}"
HEALTH_URL="http://127.0.0.1:$PORT/health"
LOCAL_MCP_URL="http://127.0.0.1:$PORT$MCP_PATH"

echo "MCP HTTP status check"
echo "Port: $PORT"
echo "Health URL: $HEALTH_URL"
echo "MCP URL: $LOCAL_MCP_URL"

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

echo

if command -v curl >/dev/null 2>&1; then
  HEALTH_RESPONSE="$(curl -fsS "$HEALTH_URL" 2>/dev/null || true)"

  if [ -n "$HEALTH_RESPONSE" ]; then
    echo "Health: reachable"
    echo "$HEALTH_RESPONSE"
  else
    echo "Health: not reachable"
  fi
else
  echo "curl not found, skipping health check"
fi

echo
echo "Log file: $LOG_FILE"

if [ -f "$LOG_FILE" ]; then
  echo
  echo "Recent log:"
  tail -20 "$LOG_FILE" 2>/dev/null || true
fi
