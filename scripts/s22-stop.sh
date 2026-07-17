#!/data/data/com.termux/files/usr/bin/bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "== S22 Web Agent stop =="

run_stop() {
  local label="$1"
  shift

  echo
  echo "-- $label --"

  if "$@"; then
    return 0
  fi

  echo "WARNING: $label reported an error; continuing cleanup." >&2
  return 0
}

run_stop "Public noVNC tunnel" \
  npm run session:novnc:public-temp:tunnel:stop

run_stop "Local noVNC" \
  npm run session:novnc:stop:local

run_stop "Playwright worker and active browser task" \
  npm run worker:stop:stable

run_stop "VNC and Chromium display runtime" \
  npm run session:vnc:stop:stable

run_stop "Runtime watcher" \
  npm run runtime:watch:stop

run_stop "OpenAI tunnel-client" \
  npm run openai:tunnel:client:stop:stable

run_stop "OpenAI local MCP/API runtime" \
  npm run openai:tunnel:stop

if command -v termux-wake-unlock >/dev/null 2>&1; then
  termux-wake-unlock >/dev/null 2>&1 || true
fi

echo
STATUS_OUTPUT="$(bash scripts/s22-status.sh)"
printf '%s\n' "$STATUS_OUTPUT"

if ! printf '%s\n' "$STATUS_OUTPUT" |
  grep -q '^Overall:[[:space:]]*STOPPED$'; then
  echo
  echo "FAIL: one or more S22 Web Agent components remain active." >&2
  exit 1
fi

echo
echo "PASS: S22 Web Agent fully stopped."
