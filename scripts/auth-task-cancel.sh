#!/usr/bin/env bash
set -euo pipefail
REPO="/data/data/com.termux/files/home/projects/mobile-job-radar-agent"
cd "$REPO"
node tools/authenticated-task-orchestrator.mjs cancel "$@"
