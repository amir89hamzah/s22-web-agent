#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROFILE="${1:-}"

check_local_listener_safety() {
  if ! command -v ss >/dev/null 2>&1; then
    echo "WARN: ss command not found; cannot inspect listening ports from Termux."
    return 0
  fi

  local listeners
  local ss_error
  ss_error="$(mktemp)"

  echo
  echo "== Local listener safety check =="

  if ! listeners="$(ss -ltn 2>"$ss_error")"; then
    echo "WARN: listener check unavailable in this Termux/Android context."
    if [[ -s "$ss_error" ]]; then
      sed 's/^/ss: /' "$ss_error"
    fi
    rm -f "$ss_error"
    echo "Use the VNC status and noVNC tmux log above as the Phase 7M safety evidence."
    return 0
  fi

  rm -f "$ss_error"

  if echo "$listeners" | grep -E ':(5901|6080)' >/dev/null 2>&1; then
    echo "$listeners" | grep -E ':(5901|6080)' || true
  else
    echo "No 5901/6080 listeners reported by ss."
  fi

  if echo "$listeners" | grep -E '0\.0\.0\.0:(5901|6080)|\[::\]:(5901|6080)|\*:(5901|6080)' >/dev/null 2>&1; then
    echo "FAIL: VNC/noVNC appears to be listening on a non-local interface." >&2
    echo "Safety rule: 5901 and 6080 must remain local-only in Phase 7M." >&2
    exit 2
  fi
}

echo "== Phase 7M local noVNC-assisted manual login status =="

echo

echo "== Stable VNC status =="
npm run session:vnc:status || true

echo

echo "== Local noVNC status =="
npm run session:novnc:status:local || true

check_local_listener_safety

echo
if [[ -n "$PROFILE" ]]; then
  echo "== Manual login job status =="
  bash scripts/session-manual-login-status.sh "$PROFILE" || true
else
  echo "== Manual login jobs =="
  if compgen -G ".runtime/manual-login-jobs/*.json" >/dev/null 2>&1; then
    for f in .runtime/manual-login-jobs/*.json; do
      name="$(basename "$f" .json)"
      status="$(grep -E '"status"' "$f" | head -1 | sed -E 's/.*"status"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)"
      echo "- $name ${status:+($status)}"
    done
  else
    echo "No manual login job state files found."
  fi
  echo
  echo "For one profile:"
  echo "  bash scripts/session-manual-login-novnc-local-status.sh <profile>"
fi

echo

echo "Safety reminder: do not print or paste passwords, cookies, tokens, MFA codes, or storageState JSON."
