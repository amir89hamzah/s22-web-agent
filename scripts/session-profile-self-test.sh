#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
TMP_ROOT="$(mktemp -d)"
PROFILE="phase7p-self-test"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

run_expect() {
  local expected_rc="$1"
  local expected_state="$2"
  shift 2

  local output
  local rc

  set +e
  output="$(SESSION_REPO_ROOT="$TMP_ROOT" node "$REPO/tools/session-profile-status.mjs" "$@" 2>&1)"
  rc=$?
  set -e

  if [[ "$rc" -ne "$expected_rc" ]]; then
    echo "FAIL: expected exit $expected_rc but got $rc" >&2
    echo "$output" >&2
    exit 1
  fi

  if ! grep -Fq "state: $expected_state" <<<"$output"; then
    echo "FAIL: expected state $expected_state" >&2
    echo "$output" >&2
    exit 1
  fi
}

cd "$REPO"

run_expect 20 missing "$PROFILE"

mkdir -p "$TMP_ROOT/.runtime/sessions/$PROFILE"
printf '%s\n' '{"cookies":[],"origins":[]}' > "$TMP_ROOT/.runtime/sessions/$PROFILE/storageState.json"
cat > "$TMP_ROOT/.runtime/sessions/$PROFILE/metadata.json" <<'JSON'
{
  "profile": "phase7p-self-test",
  "allowedDomain": "example.com"
}
JSON

run_expect 0 present_unverified "$PROFILE" "https://example.com/private"
run_expect 22 domain_mismatch "$PROFILE" "https://github.com/settings/profile"

printf '%s\n' '{invalid-json' > "$TMP_ROOT/.runtime/sessions/$PROFILE/metadata.json"
run_expect 23 runtime_error "$PROFILE" "https://example.com/private"

echo "PASS: Phase 7P local profile status self-test completed."
echo "Covered: missing, present_unverified, domain_mismatch, runtime_error."
echo "No cookie/session/token/password/MFA/storageState values were printed."
