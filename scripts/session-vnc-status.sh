#!/usr/bin/env bash
set -euo pipefail

if ! command -v proot-distro >/dev/null 2>&1; then
  echo "ERROR: proot-distro not found. Run this helper from Termux." >&2
  exit 1
fi

proot-distro login debian -- bash -lc '
echo "== VNC sessions =="
vncserver -list 2>/dev/null || true

echo
echo "== Related processes =="
ps aux | grep -Ei "Xtigervnc|chromium|openbox|xterm|playwright" | grep -v grep || true

echo
echo "== Runtime test directories =="
ls -ld /tmp/s22-vnc-chromium-test 2>/dev/null || true
'
