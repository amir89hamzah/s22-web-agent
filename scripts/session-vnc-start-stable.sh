#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
REPO="$(pwd)"
SESSION_NAME="s22vnc"

echo "== Stable VNC start =="
echo "Repo: $REPO"
echo "tmux session: $SESSION_NAME"

command -v tmux >/dev/null 2>&1 || {
  echo "FAIL: tmux is not installed. Run: pkg install -y tmux"
  exit 1
}

echo "== Stop old VNC/tmux session if any =="
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
npm run session:vnc:stop >/dev/null 2>&1 || true
pkill -f Xtigervnc 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
pkill -f openbox 2>/dev/null || true
pkill -f xterm 2>/dev/null || true

mkdir -p .runtime

cat > .runtime/s22-vnc-foreground-debian.sh <<'DEBIANEOF'
#!/usr/bin/env bash
set -euo pipefail

echo "== s22-vnc-foreground inside Debian =="
echo "Time: $(date -Is 2>/dev/null || date)"

vncserver -kill :1 2>/dev/null || true
rm -f /tmp/.X1-lock
rm -f /tmp/.X11-unix/X1
mkdir -p /root/.vnc

cat > /root/.vnc/xstartup <<'XEOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
xrdb "$HOME/.Xresources" 2>/dev/null || true
xsetroot -solid grey 2>/dev/null || true
xterm -geometry 100x30+20+20 -title "S22 Session Gateway" &
exec openbox-session
XEOF

chmod +x /root/.vnc/xstartup

if [ ! -f /root/.config/tigervnc/passwd ] && [ ! -f /root/.vnc/passwd ]; then
  echo "FAIL: VNC password file is missing."
  echo "Fix inside Debian with: vncpasswd"
  exit 2
fi

echo "Starting VNC display :1 on local-only port 5901"
echo "This command intentionally stays in foreground."
echo "tmux keeps it alive if SSH/MobaXterm disconnects."

exec vncserver -localhost yes :1 -geometry "${VNC_GEOMETRY:-1280x720}" -depth "${VNC_DEPTH:-24}" -fg
DEBIANEOF

chmod +x .runtime/s22-vnc-foreground-debian.sh

echo "== Install Debian wrapper =="
proot-distro login debian -- bash -lc "cp '$REPO/.runtime/s22-vnc-foreground-debian.sh' /usr/local/bin/s22-vnc-foreground && chmod +x /usr/local/bin/s22-vnc-foreground"

echo "== Start tmux-held Debian VNC =="
tmux new-session -d -s "$SESSION_NAME" \
  "proot-distro login debian -- bash -lc '/usr/local/bin/s22-vnc-foreground 2>&1 | tee -a /tmp/s22-vnc-foreground.log'"

sleep 4

echo
echo "== tmux sessions =="
tmux ls || true

echo
echo "== VNC status =="
npm run session:vnc:status || true

echo
echo "Next:"
echo "1. Confirm status does NOT show '(stale)'."
echo "2. Open aVNC on S22: Host 127.0.0.1, Port 5901."
echo "3. If MobaXterm disconnects, reconnect and run: tmux ls"
echo "4. To view VNC tmux session: tmux attach -t $SESSION_NAME"
echo "5. To detach without killing VNC: Ctrl+b then d"
