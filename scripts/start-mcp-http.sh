#!/data/data/com.termux/files/usr/bin/bash

set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$APP_DIR/.runtime"
LOG_FILE="$RUNTIME_DIR/mcp-http.log"
PID_FILE="$RUNTIME_DIR/mcp-http.pid"
HOST="${MCP_HTTP_HOST:-0.0.0.0}"
PORT="${MCP_HTTP_PORT:-3003}"
MCP_PATH="${MCP_HTTP_PATH:-/mcp}"
TOKEN="${MCP_HTTP_TOKEN:-}"
HEALTH_URL="http://127.0.0.1:$PORT/health"
LOCAL_MCP_URL="http://127.0.0.1:$PORT$MCP_PATH"

is_loopback_host() {
  case "$1" in
    127.0.0.1|localhost|::1) return 0 ;;
    *) return 1 ;;
  esac
}

if ! is_loopback_host "$HOST" && [ -z "$TOKEN" ]; then
  echo "FAIL: MCP_HTTP_TOKEN is required when MCP_HTTP_HOST is not loopback." >&2
  echo "Requested bind host: $HOST" >&2
  echo "Use 127.0.0.1 for unauthenticated local-only testing, or provide a strong bearer token." >&2
  exit 1
fi

mkdir -p "$RUNTIME_DIR"

cd "$APP_DIR"

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "MCP HTTP server already running"
    echo "PID: $OLD_PID"
    echo "Bind host: $HOST"
    echo "Port: $PORT"
    echo "Health URL: $HEALTH_URL"
    echo "MCP URL: $LOCAL_MCP_URL"
    echo "Log: $LOG_FILE"
    exit 0
  else
    echo "Removing stale MCP HTTP PID file"
    rm -f "$PID_FILE"
  fi
fi

if command -v curl >/dev/null 2>&1; then
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "MCP HTTP health endpoint is already reachable, but no PID file exists."
    echo "Another process may already be using port $PORT."
    echo "Health URL: $HEALTH_URL"
    echo "Try: npm run mcp:http:status"
    exit 1
  fi
fi

echo "Starting MCP HTTP server on $HOST:$PORT..."
MCP_HTTP_HOST="$HOST" \
MCP_HTTP_PORT="$PORT" \
MCP_HTTP_PATH="$MCP_PATH" \
MCP_HTTP_TOKEN="$TOKEN" \
nohup npm run mcp:http > "$LOG_FILE" 2>&1 &

NEW_PID="$!"
echo "$NEW_PID" > "$PID_FILE"

echo "MCP HTTP process started"
echo "PID: $NEW_PID"
echo "Waiting for health check..."

if command -v curl >/dev/null 2>&1; then
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if ! kill -0 "$NEW_PID" 2>/dev/null; then
      echo "MCP HTTP process stopped before becoming ready"
      echo "Check log: $LOG_FILE"
      rm -f "$PID_FILE"
      exit 1
    fi

    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      echo "MCP HTTP server ready"
      echo "PID: $NEW_PID"
      echo "Bind host: $HOST"
      echo "Port: $PORT"
      echo "Health URL: $HEALTH_URL"
      echo "MCP URL: $LOCAL_MCP_URL"
      if is_loopback_host "$HOST"; then
        echo "Network scope: local-only"
      else
        echo "Network scope: all S22 interfaces; bearer authentication is required and enabled"
        echo "Trusted LAN endpoint: http://<S22-IP>:$PORT$MCP_PATH"
      fi
      echo "Log: $LOG_FILE"
      exit 0
    fi

    sleep 1
  done

  echo "MCP HTTP process is running, but health check did not become ready in time"
  echo "PID: $NEW_PID"
  echo "Health URL: $HEALTH_URL"
  echo "Log: $LOG_FILE"
  echo
  echo "Recent log:"
  tail -20 "$LOG_FILE" 2>/dev/null || true
  exit 1
else
  sleep 2

  if kill -0 "$NEW_PID" 2>/dev/null; then
    echo "MCP HTTP server started"
    echo "PID: $NEW_PID"
    echo "Bind host: $HOST"
    echo "Port: $PORT"
    echo "Log: $LOG_FILE"
  else
    echo "MCP HTTP server failed to start"
    echo "Check log: $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
fi
