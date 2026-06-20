#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

TARGET_URL="${MCP_TUNNEL_TARGET:-http://127.0.0.1:3003}"

if [ -z "${MCP_HTTP_TOKEN:-}" ]; then
  echo "ERROR: MCP_HTTP_TOKEN is required before starting a public tunnel."
  echo "Generate one first:"
  echo '  export MCP_HTTP_TOKEN="$(node -e "console.log(require('\''crypto'\'').randomBytes(24).toString('\''hex'\''))")"'
  exit 1
fi

case "$TARGET_URL" in
  http://127.0.0.1:3003|http://localhost:3003)
    ;;
  *)
    echo "ERROR: Refusing to expose anything except MCP HTTP port 3003."
    echo "Allowed target: http://127.0.0.1:3003"
    echo "Current target: $TARGET_URL"
    exit 1
    ;;
esac

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ERROR: cloudflared not found."
  echo "Try: pkg install cloudflared"
  exit 1
fi

echo "Starting Cloudflare Quick Tunnel"
echo "Public -> cloudflared -> $TARGET_URL"
echo "MCP_HTTP_TOKEN is present."
echo "Only MCP HTTP port 3003 is targeted."

cloudflared tunnel --url "$TARGET_URL"
