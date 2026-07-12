#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

JOB="${1:-}"
CONFIRMATION="${2:-}"
OVERRIDE_TARGET_URL="${3:-}"
OVERRIDE_EXPECTED_TEXT="${4:-}"
TASK_DIR=".runtime/authenticated-tasks"
MANUAL_DIR=".runtime/manual-login-jobs"

usage() {
  echo "Usage: bash scripts/auth-login-gateway-complete.sh <job> confirmed [authenticated-target-url expected-text]" >&2
}

if [[ -z "$JOB" || "$CONFIRMATION" != "confirmed" ]]; then
  usage
  exit 21
fi

if [[ -n "$OVERRIDE_TARGET_URL" && -z "$OVERRIDE_EXPECTED_TEXT" ]] || \
   [[ -z "$OVERRIDE_TARGET_URL" && -n "$OVERRIDE_EXPECTED_TEXT" ]]; then
  echo "state: runtime_error" >&2
  echo "message: authenticated target URL and expected text must be provided together" >&2
  exit 23
fi

if [[ ! "$JOB" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "state: runtime_error" >&2
  echo "message: invalid authenticated task job name" >&2
  exit 23
fi

TASK_PATH="$TASK_DIR/${JOB}.json"
if [[ ! -f "$TASK_PATH" ]]; then
  echo "state: runtime_error" >&2
  echo "message: authenticated task job not found" >&2
  exit 23
fi

TASK_INFO="$(node - "$TASK_PATH" <<'NODE'
const fs = require('fs');
const taskPath = process.argv[2];
const safeName = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
let task;
try {
  task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
} catch {
  process.exit(2);
}
if (task.state !== 'waiting_for_user_login') process.exit(3);
if (!safeName.test(String(task.profile || ''))) process.exit(4);
process.stdout.write(`${task.profile}\t${task.publicGatewayStarted === true ? 'active' : 'inactive'}`);
NODE
)" || {
  echo "state: runtime_error" >&2
  echo "message: login gateway completion requires a waiting_for_user_login task with a safe profile" >&2
  exit 23
}

PROFILE="${TASK_INFO%%$'\t'*}"
GATEWAY_STATE="${TASK_INFO#*$'\t'}"

if [[ "$GATEWAY_STATE" == "active" ]]; then
  SESSION_NOVNC_STOP_AFTER_COMPLETE=1 \
  SESSION_VNC_STOP_AFTER_COMPLETE=1 \
  SESSION_SCAN_SUPPRESS_EXCERPT=1 \
    bash scripts/session-manual-login-novnc-local-complete.sh "$PROFILE" >/dev/null
else
  MANUAL_STATE="$MANUAL_DIR/${PROFILE}.json"
  STORAGE_STATE=".runtime/sessions/${PROFILE}/storageState.json"
  METADATA=".runtime/sessions/${PROFILE}/metadata.json"

  if [[ ! -f "$MANUAL_STATE" ]] || ! grep -q '"status"[[:space:]]*:[[:space:]]*"completed"' "$MANUAL_STATE"; then
    echo "state: runtime_error" >&2
    echo "message: inactive gateway recovery requires a completed manual-login job" >&2
    exit 23
  fi

  if [[ ! -f "$STORAGE_STATE" || ! -f "$METADATA" ]]; then
    echo "state: runtime_error" >&2
    echo "message: completed manual login did not leave both required profile artifacts" >&2
    exit 23
  fi
fi

if [[ -n "$OVERRIDE_TARGET_URL" ]]; then
  node - "$TASK_PATH" "$OVERRIDE_TARGET_URL" "$OVERRIDE_EXPECTED_TEXT" <<'NODE' || {
const fs = require('fs');
const taskPath = process.argv[2];
const rawTargetUrl = process.argv[3];
const expectedText = String(process.argv[4] || '');
let url;
try {
  url = new URL(rawTargetUrl);
} catch {
  process.exit(2);
}
if (!['http:', 'https:'].includes(url.protocol)) process.exit(3);
if (url.username || url.password) process.exit(4);
if (!expectedText || expectedText.length > 500) process.exit(5);
const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
task.targetUrl = url.href;
task.expectedText = expectedText;
task.probeOverrideAppliedAt = new Date().toISOString();
const tempPath = `${taskPath}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
fs.renameSync(tempPath, taskPath);
NODE
    echo "state: runtime_error" >&2
    echo "message: authenticated target override is invalid" >&2
    exit 23
  }
fi

HANDOFF_AT="$(date -Is)"
node - "$TASK_PATH" "$HANDOFF_AT" <<'NODE'
const fs = require('fs');
const taskPath = process.argv[2];
const handoffAt = process.argv[3];
const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));

// Close the approval-gated gateway state before invoking the generic resume
// action. The generic task orchestrator deliberately refuses to resume while
// a gateway is still marked active or waiting for user login.
task.state = 'login_required';
task.approvalRequired = false;
task.publicGatewayStarted = false;
task.gatewayUrl = null;
task.gatewayCompletedAt = handoffAt;
task.updatedAt = handoffAt;
task.next = 'Manual login profile was captured. Re-checking the authenticated target now.';

const tempPath = `${taskPath}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
fs.renameSync(tempPath, taskPath);
NODE

RESUME_STDOUT="$(mktemp)"
RESUME_STDERR="$(mktemp)"
trap 'rm -f "$RESUME_STDOUT" "$RESUME_STDERR"' EXIT

set +e
SESSION_SCAN_SUPPRESS_EXCERPT=1 \
  bash scripts/auth-task-resume.sh "$JOB" >"$RESUME_STDOUT" 2>"$RESUME_STDERR"
RESUME_RC=$?
set -e

case "$RESUME_RC" in
  0|21|22|23|24) ;;
  *)
    echo "state: runtime_error" >&2
    echo "message: authenticated task resume failed after profile capture" >&2
    exit 23
    ;;
esac

FINAL_AT="$(date -Is)"
node - "$TASK_PATH" "$FINAL_AT" "$RESUME_RC" <<'NODE'
const fs = require('fs');
const taskPath = process.argv[2];
const finalAt = process.argv[3];
const resumeExitCode = Number(process.argv[4]);
const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
task.publicGatewayStarted = false;
task.gatewayCompletedAt = task.gatewayCompletedAt || finalAt;
task.updatedAt = finalAt;
task.gatewayLastResumeExitCode = resumeExitCode;
const tempPath = `${taskPath}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
fs.renameSync(tempPath, taskPath);
NODE

STATUS_JSON="$(node tools/auth-login-gateway-orchestrator.mjs status "$JOB")"
printf '%s\n' "$STATUS_JSON"

FINAL_STATE="$(node -e 'const value = JSON.parse(process.argv[1]); process.stdout.write(String(value.state || "runtime_error"));' "$STATUS_JSON")"
if [[ "$FINAL_STATE" == "ready" ]]; then
  exit 0
fi

exit 21
