#!/usr/bin/env bash
set -euo pipefail

REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
HELPER="tools/proot-playwright-worker/session-profile-scan.mjs"
WRAPPER="scripts/session-profile-scan.sh"
LOG=".runtime/session-profile-scan-proof.log"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cd "$REPO"
mkdir -p .runtime

echo "== Phase 7E proof guard =="
echo "repo: $REPO"

test -s "$HELPER" || fail "$HELPER is missing or empty."
test -s "$WRAPPER" || fail "$WRAPPER is missing or empty."

HELPER_LINES="$(wc -l < "$HELPER" | tr -d ' ')"
WRAPPER_LINES="$(wc -l < "$WRAPPER" | tr -d ' ')"

echo "helperLines: $HELPER_LINES"
echo "wrapperLines: $WRAPPER_LINES"

if [ "$HELPER_LINES" -lt 150 ]; then
  fail "$HELPER looks truncated. Expected at least 150 lines."
fi

grep -q "SAFE_PROFILE_RE" "$HELPER" || fail "SAFE_PROFILE_RE guard missing."
grep -q "storageStatePath" "$HELPER" || fail "storageStatePath internal resolution missing."
grep -q "metadataPath" "$HELPER" || fail "metadataPath internal resolution missing."
grep -q "allowedDomain" "$HELPER" || fail "allowedDomain validation missing."
grep -q "chromium.launch" "$HELPER" || fail "chromium launch missing."
grep -q "PASS: profile-aware headless scan completed." "$HELPER" || fail "PASS marker missing from helper."

if grep -q "storageState.json" "$LOG" 2>/dev/null; then
  fail "Existing proof log contains storageState path text unexpectedly. Remove/review .runtime proof log."
fi

if [ "${1:-}" = "--guard-only" ]; then
  echo "PASS: proof guard checks completed."
  exit 0
fi

PROFILE="${1:-local-login-demo}"
URL="${2:-http://127.0.0.1:3107/secure}"
EXPECTED_TEXT="${3:-S22 DEMO AUTH PASS}"

echo "profile: $PROFILE"
echo "url: $URL"
echo "expectedText: $EXPECTED_TEXT"
echo "log: $LOG"

bash "$WRAPPER" "$PROFILE" "$URL" "$EXPECTED_TEXT" | tee "$LOG"

grep -q "profile: $PROFILE" "$LOG" || fail "profile line not found in proof log."
grep -q "allowedDomain:" "$LOG" || fail "allowedDomain line not found in proof log."
grep -q "browserExecutable:" "$LOG" || fail "browserExecutable line not found in proof log."
grep -q "$EXPECTED_TEXT" "$LOG" || fail "expected text not found in proof log."
grep -q "expectedText: found" "$LOG" || fail "expectedText found marker missing."
grep -q "PASS: profile-aware headless scan completed." "$LOG" || fail "scan PASS marker missing."
grep -q "No cookie/session values were printed." "$LOG" || fail "safe no-secret marker missing."

echo "PASS: Phase 7E proof scan checks completed."
