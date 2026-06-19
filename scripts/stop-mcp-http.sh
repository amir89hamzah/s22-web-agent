#!/data/data/com.termux/files/usr/bin/bash

set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$APP_DIR/.runtime"
PID_FILE="$RUNTIME_DIR/mcp-http.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No MCP HTTP PID file found"
  exit 0
fi

PID="$(cat "$PID_FILE")"

if kill -0 "$PID" 2>/dev/null; then
  echo "Stopping MCP HTTP server PID $PID..."
  kill "$PID"
  sleep 1

  if kill -0 "$PID" 2>/dev/null; then
    echo "Process still running, forcing stop..."
    kill -9 "$PID" 2>/dev/null || true
  fi

  echo "MCP HTTP server stopped"
else
  echo "MCP HTTP server process not running"
fi

rm -f "$PID_FILE"
