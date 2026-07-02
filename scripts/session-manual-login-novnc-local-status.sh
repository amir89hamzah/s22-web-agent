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
  listeners="$(ss -ltn 2>/dev/null || true)"

  echo
  echo "== Local listener safety check =="
  echo "$listeners" | grep -E ':(5901|6080)' || echo "No 5901/6080 listeners found."

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
