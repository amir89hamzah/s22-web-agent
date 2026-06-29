#!/usr/bin/env bash
set -euo pipefail

DISPLAY_NUM="${SESSION_VNC_DISPLAY:-1}"

if ! command -v proot-distro >/dev/null 2>&1; then
  echo "ERROR: proot-distro not found. Run this helper from Termux." >&2
  exit 1
fi

proot-distro login debian -- bash -lc "
set -euo pipefail
DISPLAY_NUM='$DISPLAY_NUM'

echo '== Stop Chromium/VNC test processes =='
pkill -f 'chromium.*s22-vnc-chromium-test' 2>/dev/null || true
pkill -f '/tmp/s22-vnc-chromium-test' 2>/dev/null || true

echo '== Stop VNC display =='
vncserver -kill :\"\$DISPLAY_NUM\" 2>/dev/null || true
pkill -f \"Xtigervnc.*:\"\$DISPLAY_NUM 2>/dev/null || true

echo '== Remove stale test artifacts =='
rm -rf /tmp/s22-vnc-chromium-test
rm -f /tmp/.X\"\$DISPLAY_NUM\"-lock
rm -f /tmp/.X11-unix/X\"\$DISPLAY_NUM\"
rm -f /root/.vnc/*:\"\$DISPLAY_NUM\".pid
rm -f /root/.vnc/*:\"\$DISPLAY_NUM\".log

echo
echo '== Remaining VNC sessions =='
vncserver -list 2>/dev/null || true

echo
echo '== Remaining related processes =='
ps aux | grep -Ei 'Xtigervnc|chromium|openbox|xterm|playwright' | grep -v grep || true
"
