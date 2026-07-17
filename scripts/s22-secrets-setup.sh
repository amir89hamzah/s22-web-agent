#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

CONFIG_DIR="${S22_CONFIG_DIR:-$HOME/.config/s22-web-agent}"
OPENAI_KEY_FILE="$CONFIG_DIR/control-plane-api-key"
CLOUDFLARE_TOKEN_FILE="$CONFIG_DIR/cloudflare-tunnel-token"

umask 077
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

restore_echo() {
  stty echo 2>/dev/null || true
}

trap restore_echo EXIT INT TERM

save_secret() {
  local label="$1"
  local target="$2"
  local required="$3"
  local value=""
  local answer=""

  if [ -f "$target" ]; then
    printf '%s already exists. Replace it? [y/N]: ' "$label"
    IFS= read -r answer

    case "$answer" in
      y|Y|yes|YES) ;;
      *)
        echo "Kept existing $label."
        return 0
        ;;
    esac
  fi

  printf 'Enter %s (input hidden): ' "$label"
  stty -echo
  IFS= read -r value
  stty echo
  echo

  if [ -z "$value" ]; then
    if [ "$required" = "yes" ]; then
      echo "FAIL: $label cannot be empty." >&2
      exit 1
    fi

    echo "Skipped optional $label."
    return 0
  fi

  case "$value" in
    PASTE_KEY_AWAK_DI_SINI|PASTE_RUNTIME_KEY_HERE)
      echo "FAIL: placeholder text is not a valid secret." >&2
      exit 1
      ;;
  esac

  printf '%s' "$value" > "$target"
  chmod 600 "$target"
  unset value

  echo "Saved $label securely."
}

echo "== S22 Web Agent secret setup =="
echo "Secrets are stored outside the Git repository."
echo

save_secret "OpenAI runtime API key" "$OPENAI_KEY_FILE" yes
echo
save_secret "Cloudflare Tunnel token" "$CLOUDFLARE_TOKEN_FILE" no

echo
echo "PASS: secret setup complete."
echo "Directory: $CONFIG_DIR"
echo "Secret values were not printed."
