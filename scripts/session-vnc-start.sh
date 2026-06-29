#!/usr/bin/env bash
set -euo pipefail

DISPLAY_NUM="${SESSION_VNC_DISPLAY:-1}"
GEOMETRY="${SESSION_VNC_GEOMETRY:-1280x720}"
DEPTH="${SESSION_VNC_DEPTH:-24}"

if ! command -v proot-distro >/dev/null 2>&1; then
  echo "ERROR: proot-distro not found. Run this helper from Termux." >&2
  exit 1
fi

proot-distro login debian -- bash -lc "
set -euo pipefail

DISPLAY_NUM='$DISPLAY_NUM'
GEOMETRY='$GEOMETRY'
DEPTH='$DEPTH'

echo '== Debian VNC start pre-check =='
command -v vncserver >/dev/null || { echo 'ERROR: vncserver missing. Install tigervnc-standalone-server inside Debian.' >&2; exit 1; }
command -v openbox >/dev/null || { echo 'ERROR: openbox missing. Install openbox inside Debian.' >&2; exit 1; }
command -v xterm >/dev/null || { echo 'ERROR: xterm missing. Install xterm inside Debian.' >&2; exit 1; }

if [ ! -f /root/.config/tigervnc/passwd ] && [ ! -f /root/.vnc/passwd ]; then
  echo 'ERROR: VNC password is not set.'
  echo 'Run inside Debian: vncpasswd'
  echo 'Do not paste the VNC password into ChatGPT.'
  exit 1
fi

mkdir -p /root/.vnc

cat > /root/.vnc/xstartup <<'XSTARTUP'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

xrdb \"\$HOME/.Xresources\" 2>/dev/null || true
xsetroot -solid grey 2>/dev/null || true

xterm -geometry 100x30+20+20 -title \"S22 Session Gateway\" &
exec openbox-session
XSTARTUP

chmod +x /root/.vnc/xstartup

echo '== Stop stale display if needed =='
vncserver -kill :\"\$DISPLAY_NUM\" 2>/dev/null || true
rm -f /tmp/.X\"\$DISPLAY_NUM\"-lock
rm -f /tmp/.X11-unix/X\"\$DISPLAY_NUM\"

echo '== Start local-only VNC =='
vncserver -localhost yes :\"\$DISPLAY_NUM\" -geometry \"\$GEOMETRY\" -depth \"\$DEPTH\"

echo
echo '== VNC status =='
vncserver -list || true

echo
echo 'Connect from S22 Android VNC app only:'
echo \"  Host: 127.0.0.1\"
echo \"  Port: \$((5900 + DISPLAY_NUM))\"
echo 'Do not expose raw VNC publicly.'
"
