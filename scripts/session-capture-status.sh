#!/usr/bin/env bash
set -euo pipefail

SESSION_ROOT=".runtime/sessions"

echo "== Session profiles =="
if [ ! -d "$SESSION_ROOT" ]; then
  echo "No session profiles found."
  exit 0
fi

find "$SESSION_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | while read -r dir; do
  profile="$(basename "$dir")"
  state="$dir/storageState.json"
  meta="$dir/metadata.json"

  echo
  echo "profile: $profile"
  if [ -f "$state" ]; then
    bytes="$(wc -c < "$state" | tr -d ' ')"
    echo "  storageState: present (${bytes} bytes)"
  else
    echo "  storageState: missing"
  fi

  if [ -f "$meta" ]; then
    echo "  metadata: present"
    grep -E '"allowedDomain"|"url"|"createdBy"|"createdAt"' "$meta" | sed 's/^/    /' || true
  else
    echo "  metadata: missing"
  fi
done

echo
echo "Secret values are not displayed by this status command."
