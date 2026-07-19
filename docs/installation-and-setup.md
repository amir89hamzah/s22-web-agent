# S22 Web Agent — Installation and Setup Guide

## Purpose

This guide documents how to reproduce the current S22 Web Agent environment on
another Android device using the repository as it exists today.

Example future targets include another Samsung phone such as an S26 or another
Android device capable of running Termux and Debian proot.

This is a manual setup guide.

The repository does not currently provide:

- a complete automated installer
- a complete fresh-device dependency validator
- the future proposed `s22:doctor`
- automatic Android system configuration
- automatic OpenAI tunnel provisioning
- automatic Cloudflare dashboard configuration

This guide is based on the environment that has been proven on the current
Samsung S22.

A fresh installation on a different device should be treated as a new
reproducibility test until it has been verified end to end.

---

# 1. Architecture being reproduced

The current runtime is:

```text
Android device
  -> Termux
      -> Node.js local API on 127.0.0.1:3001
      -> Node.js MCP HTTP on 127.0.0.1:3003
      -> tmux
      -> cloudflared for temporary protected noVNC when required
      -> Debian proot
          -> Node.js
          -> Playwright
          -> Chromium
          -> TigerVNC
          -> Openbox
          -> xterm
          -> noVNC/websockify
          -> OpenAI tunnel-client
```

Normal operator startup is:

```text
npm run s22:start
```

This starts the core API, MCP HTTP, and stable OpenAI tunnel-client.

The browser worker, VNC, Chromium, local noVNC, and temporary public noVNC
connector remain lazy and start only when required.

---

# 2. Important portability boundary

## Required repository path for the current implementation

The current repository contains multiple scripts with the Android Termux path:

```text
/data/data/com.termux/files/home/projects/mobile-job-radar-agent
```

Therefore, for a fresh device using the repository without code changes, clone
the repository to:

```text
~/projects/mobile-job-radar-agent
```

Do not clone to an arbitrary directory and assume every helper will work.

Supporting arbitrary repository locations would require a separate portability
refactor and is outside the scope of this installation guide.

---

# 3. Known-working S22 reference environment

The following versions were observed on the working S22 during documentation
closure.

They are a reference, not strict version pins for every future device.

## Termux reference

```text
Architecture: aarch64
Git:          2.54.0
Node.js:      v24.15.0
npm:          11.16.0
tmux:         3.6b
cloudflared:  2026.6.1
```

Observed Termux package ownership:

```text
git                -> git
node               -> nodejs-lts
npm                -> npm
curl               -> curl
tmux               -> tmux
proot-distro       -> proot-distro
cloudflared        -> cloudflared
termux-wake-lock   -> termux-tools
```

## Debian reference

The working S22 currently uses:

```text
Debian GNU/Linux 13 (trixie)
Architecture: aarch64
```

Observed Debian packages:

```text
chromium                    149.0.7827.114-1~deb13u1
nodejs                      20.19.2+dfsg-1+deb13u2
npm                         9.2.0~ds1-3
novnc                       1:1.6.0-2
openbox                     3.6.1-12+b2
tigervnc-common             1.15.0+dfsg-2
tigervnc-standalone-server  1.15.0+dfsg-2
websockify                  0.12.0+dfsg1-4+b1
xterm                       398-1
```

Future package versions may differ.

Do not downgrade or upgrade solely to match these numbers unless a compatibility
problem is actually identified.

---

# 4. Android prerequisites

The target device should have:

- enough storage for Termux, Debian proot, Chromium, Node modules, and runtime
  data
- a 64-bit ARM environment compatible with the required Linux ARM64 external
  tunnel-client, if that same binary architecture is used
- stable network access
- permission for Termux to run for the intended job duration

The demonstrated S22 configuration also used operational measures to reduce
Android background-process instability.

These included:

- Termux wake lock during active work
- tmux for long-running services
- one primary SSH session where practical
- Android phantom-process limit raised to 256 during the successful full-stack
  proof
- RAM Plus set to 8 GB on the demonstrated S22

These are not universal application requirements.

The phantom-process setting is outside this repository and may behave
differently on another Android or One UI version.

Do not automatically apply S22-specific Android settings to a future device
without verifying that the same problem exists.

See:

```text
docs/android-phantom-process-runtime-result.md
```

for the original S22 runtime evidence.

---

# 5. Install Termux prerequisites

The currently verified S22 uses Termux from Google Play.

This guide does not require migration to F-Droid.

On a future device, use a Termux environment where the required packages are
available and working.

Update package metadata:

```bash
pkg update
```

Install the main Termux dependencies used by the current runtime:

```bash
pkg install -y \
  git \
  nodejs-lts \
  npm \
  curl \
  tmux \
  proot-distro \
  cloudflared
```

The current S22 also provides `termux-wake-lock` through `termux-tools`.

Verify:

```bash
command -v termux-wake-lock
```

If it is not available and the package exists in the selected Termux
distribution:

```bash
pkg install -y termux-tools
```

Optional operator tools such as SSH may be installed separately if remote shell
access is required.

SSH is useful for administration but is not the application architecture
itself.

---

# 6. Clone the repository at the required path

Create the parent directory:

```bash
mkdir -p ~/projects
cd ~/projects
```

Clone the GitHub repository using the required local directory name:

```bash
git clone https://github.com/amir89hamzah/s22-web-agent.git mobile-job-radar-agent
```

Enter the repository:

```bash
cd ~/projects/mobile-job-radar-agent
```

Confirm Git state:

```bash
git status --short --branch
git log -1 --oneline
```

For the documentation-closure baseline, the repository was based on:

```text
ae621f4 Add future browser capability and reliability backlog
```

A future installation should normally use the intended current branch or
checkpoint rather than assuming this commit will always remain latest.

---

# 7. Install root Node.js dependencies

The repository contains a root `package-lock.json`.

From Termux:

```bash
cd ~/projects/mobile-job-radar-agent
npm ci
```

If a future dependency change intentionally updates `package-lock.json`, follow
the repository state for that checkpoint.

Do not upgrade npm to a new major version merely because an update notice
appears during installation.

---

# 8. Install Debian proot

From Termux:

```bash
proot-distro install debian
```

Enter Debian:

```bash
proot-distro login debian
```

Confirm the distribution:

```bash
cat /etc/os-release
uname -m
```

The current working reference is Debian 13 on `aarch64`.

A newer Debian release may work, but it should be treated as a new compatibility
test.

---

# 9. Install Debian runtime packages

Inside Debian proot:

```bash
apt-get update
```

Install the packages required by the current browser and VNC stack:

```bash
apt-get install -y \
  nodejs \
  npm \
  chromium \
  tigervnc-standalone-server \
  tigervnc-common \
  openbox \
  xterm \
  novnc \
  websockify
```

Useful setup utilities may also be installed when needed:

```bash
apt-get install -y \
  ca-certificates \
  curl \
  unzip
```

Verify the required commands:

```bash
command -v node
command -v npm
command -v chromium
command -v vncserver
command -v openbox
command -v xterm
command -v websockify
test -d /usr/share/novnc
```

The current browser helpers expect the default Chromium executable at:

```text
/usr/bin/chromium
```

The current local noVNC helper expects the web root at:

```text
/usr/share/novnc
```

---

# 10. Install Playwright worker dependencies

The Playwright worker has its own `package.json` and `package-lock.json`.

Inside Debian proot:

```bash
cd /data/data/com.termux/files/home/projects/mobile-job-radar-agent/tools/proot-playwright-worker
npm ci
```

The worker uses the system Chromium inside Debian rather than Playwright
downloading a separate browser for native Android Termux.

The current dependency set includes Playwright and Playwright Core.

Do not run a native Android Playwright browser install and assume it replaces
the Debian Chromium architecture.

---

# 11. Configure the VNC password

The VNC runtime requires a password file inside Debian.

Inside Debian proot:

```bash
vncpasswd
```

Enter the VNC password interactively.

Do not store or document the password in the repository.

The current scripts accept the password file in either of these locations:

```text
/root/.config/tigervnc/passwd
/root/.vnc/passwd
```

The stable VNC runtime uses:

```text
Display: :1
Port: 5901
Bind: local-only
tmux session: s22vnc
```

Raw port `5901` must never be exposed publicly.

---

# 12. Verify the local VNC runtime

Exit Debian back to Termux if required:

```bash
exit
```

From the repository in Termux:

```bash
cd ~/projects/mobile-job-radar-agent
npm run session:vnc:start:stable
```

Check status:

```bash
npm run session:vnc:status
```

Stop after the verification:

```bash
npm run session:vnc:stop:stable
```

A local VNC client on the Android device may connect to:

```text
Host: 127.0.0.1
Port: 5901
```

Do not use a public IP for raw VNC.

---

# 13. Verify local noVNC/websockify

Local noVNC requires the VNC service to be available for an actual browser
session, but the gateway itself can be checked independently.

Manual start:

```bash
npm run session:novnc:start:local
```

Status:

```bash
npm run session:novnc:status:local
```

Default local URL:

```text
http://127.0.0.1:6080/vnc.html?host=127.0.0.1&port=6080
```

Stop:

```bash
npm run session:novnc:stop:local
```

Port `6080` remains local-only by default.

The normal Phase 7V browser-control lifecycle starts and stops local noVNC
automatically when a human handoff is requested.

Manual operation is mainly for installation verification and troubleshooting.

---

# 14. Install the external OpenAI tunnel-client

The OpenAI tunnel-client is not included in this Git repository.

The verified S22 setup used a Linux ARM64 tunnel-client binary executed inside
Debian proot.

Direct execution of the historical Linux ARM64 binary in native Termux failed,
while the same binary worked inside Debian proot.

The current wrappers expect the executable at:

```text
/data/data/com.termux/files/home/tools/openai-tunnel/tunnel-client
```

Create the directory from Termux:

```bash
mkdir -p ~/tools/openai-tunnel
```

Obtain the compatible tunnel-client binary through the approved OpenAI tunnel
setup for the environment being reproduced.

Place the executable at:

```text
~/tools/openai-tunnel/tunnel-client
```

Make it executable:

```bash
chmod 700 ~/tools/openai-tunnel/tunnel-client
```

Verify from inside Debian:

```bash
proot-distro login debian -- bash -lc \
  '/data/data/com.termux/files/home/tools/openai-tunnel/tunnel-client --version'
```

Historical project evidence used tunnel-client version `0.0.9`.

That version is recorded only as historical evidence.

This guide does not claim that `0.0.9` is the current or required version for a
future installation.

---

# 15. Configure the OpenAI tunnel-client profile

The normal runtime expects the profile name:

```text
s22-web-agent-local
```

The verified profile path inside Debian was:

```text
/root/.config/tunnel-client/s22-web-agent-local.yaml
```

The profile connects to:

```text
http://127.0.0.1:3003/mcp
```

Historical profile initialization used:

```bash
tunnel-client init \
  --sample sample_mcp_remote_no_auth \
  --profile s22-web-agent-local \
  --tunnel-id <your-tunnel-id> \
  --mcp-server-url http://127.0.0.1:3003/mcp
```

The tunnel ID is an external control-plane value and must not be committed to
the repository.

The repository does not automatically create the tunnel ID.

If a future tunnel-client release changes its profile initialization syntax,
follow the matching approved tunnel-client setup while preserving the required
local MCP target and profile expected by the repository wrappers.

Verify that the profile exists inside Debian before attempting the normal S22
startup.

---

# 16. Configure the OpenAI runtime API key

The normal `s22:start` command requires an OpenAI runtime API key used by the
tunnel-client control path.

Do not save the key in the Git repository.

The project stores it outside Git at:

```text
~/.config/s22-web-agent/control-plane-api-key
```

Use the project secret setup helper from Termux:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:secrets:setup
```

Enter the key only at the hidden prompt.

The helper creates restricted configuration files outside the repository.

Do not paste the key into:

- chat
- documentation
- screenshots
- shell command history
- Git
- issue reports

---

# 17. Configure Cloudflare for protected public noVNC

Cloudflare is used for the temporary protected human browser-control path.

It is separate from the normal OpenAI MCP tunnel.

For the current Phase 7V design, the public browser-control route is:

```text
remote browser
  -> Cloudflare Access protected hostname
  -> cloudflared connector on Android/Termux
  -> local noVNC 127.0.0.1:6080
  -> local VNC 127.0.0.1:5901
  -> Debian Chromium
```

The demonstrated hostname is:

```text
s22login.aidesk.rest
```

The demonstrated route points to:

```text
http://127.0.0.1:6080
```

The public hostname must be protected by Cloudflare Access or an equivalent
intentional access-control policy.

The protection layers are separate:

```text
Layer 1: Cloudflare Access
Layer 2: noVNC/VNC password
Layer 3: target website login inside Chromium
```

The repository does not create the Cloudflare tunnel, DNS route, public
hostname, or Access policy automatically.

Those must be configured in the Cloudflare account.

Do not expose:

```text
3001
3002
5901
```

through the public noVNC route.

The normal current MCP architecture should continue to use the OpenAI tunnel
path rather than recreating legacy Route A as the routine operator path.

---

# 18. Configure the Cloudflare tunnel token

The automatic Phase 7V public noVNC handoff requires a Cloudflare tunnel token.

The project stores it outside Git at:

```text
~/.config/s22-web-agent/cloudflare-tunnel-token
```

Use:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:secrets:setup
```

The Cloudflare token prompt is optional in the helper because the core OpenAI
MCP runtime can exist without public noVNC.

However, the token is required for automatic protected public noVNC handoff.

Never place the token directly in:

- Git
- chat
- documentation
- screenshots
- shell command history

The current launcher is designed to reduce token exposure through process
arguments and diagnostics.

---

# 19. Public noVNC URL

The Phase 7V default browser-control URL is:

```text
https://s22login.aidesk.rest/vnc.html?host=s22login.aidesk.rest&port=443&autoconnect=1&resize=scale
```

A different future hostname may be used by configuring:

```text
S22_PUBLIC_NOVNC_URL
```

The Cloudflare route and the configured public noVNC URL must agree.

A remote browser must use the public hostname.

Do not use:

```text
host=127.0.0.1
```

in a remote public noVNC URL because that would refer to the remote user's
computer rather than the Android device.

---

# 20. Verify root project dependencies

From Termux:

```bash
cd ~/projects/mobile-job-radar-agent
node --version
npm --version
npm ci
```

Check that the expected operator commands exist:

```bash
node -e 'const p=require("./package.json"); console.log(Object.keys(p.scripts).sort().join("\n"))'
```

At minimum, the current operator lifecycle should include:

```text
s22:secrets:setup
s22:start
s22:status
s22:stop
```

---

# 21. Verify Debian browser dependencies

From Termux:

```bash
proot-distro login debian -- bash -lc '
for cmd in node npm chromium vncserver openbox xterm websockify; do
  command -v "$cmd" || exit 1
done
test -d /usr/share/novnc || exit 1
echo "PASS: Debian browser dependencies found"
'
```

This is a manual verification step.

It is not a replacement for the future proposed comprehensive `s22:doctor`.

---

# 22. Verify the external tunnel-client

From Termux:

```bash
proot-distro login debian -- bash -lc '
test -x /data/data/com.termux/files/home/tools/openai-tunnel/tunnel-client || exit 1
test -f /root/.config/tunnel-client/s22-web-agent-local.yaml || exit 1
echo "PASS: tunnel-client executable and profile found"
'
```

Do not print the profile contents if they contain sensitive control-plane
information.

---

# 23. Verify stored secret files safely

From Termux:

```bash
test -s ~/.config/s22-web-agent/control-plane-api-key && \
echo "PASS: OpenAI runtime key file exists"
```

For automatic public noVNC handoff:

```bash
test -s ~/.config/s22-web-agent/cloudflare-tunnel-token && \
echo "PASS: Cloudflare tunnel token file exists"
```

Do not use `cat` to display either secret.

Expected secure permissions are restrictive, normally:

```text
configuration directory: 700
secret files:             600
```

---

# 24. First core startup

From Termux:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:start
```

Expected result:

```text
PASS: S22 Web Agent READY
```

Then check:

```bash
npm run s22:status
```

Expected healthy core state:

```text
Overall: READY
API 3001: ready
MCP 3003: ready
OpenAI tmux: running
Tunnel process: running
```

The following may correctly remain off before browser work:

```text
Browser worker
VNC 5901
noVNC 6080
Public tunnel
```

This is expected lazy-runtime behaviour.

---

# 25. Verify local API and MCP health

With the core runtime running:

```bash
curl -fsS http://127.0.0.1:3001/health
```

Then:

```bash
curl -fsS http://127.0.0.1:3003/health
```

Both should be reachable locally.

Do not make API port `3001` public.

Do not expose MCP port `3003` through an unintended unauthenticated public
route.

---

# 26. Verify the Playwright worker manually

The normal browser workflow can start the worker automatically.

For installation verification, it may be started manually:

```bash
npm run worker:start:stable
```

Check:

```bash
npm run worker:status:stable
```

The worker health endpoint is:

```text
http://127.0.0.1:3002/health
```

Stop the manual verification worker when finished:

```bash
npm run worker:stop:stable
```

Do not start multiple workers.

---

# 27. Verify VNC and local noVNC manually

Start VNC:

```bash
npm run session:vnc:start:stable
```

Check VNC:

```bash
npm run session:vnc:status
```

Start local noVNC:

```bash
npm run session:novnc:start:local
```

Check local noVNC:

```bash
npm run session:novnc:status:local
```

Verify locally that port `6080` is available only on the intended local path.

Then stop the manual noVNC test:

```bash
npm run session:novnc:stop:local
```

Stop the VNC test:

```bash
npm run session:vnc:stop:stable
```

The normal Phase 7V browser-control handoff later manages these automatically.

---

# 28. Verify the temporary Cloudflare connector manually

Only perform this after:

- Cloudflare tunnel configuration exists
- the public hostname route exists
- Cloudflare Access protection exists
- the tunnel token has been stored safely

Start:

```bash
npm run session:novnc:public-temp:tunnel:start
```

Status:

```bash
npm run session:novnc:public-temp:tunnel:status
```

Stop:

```bash
npm run session:novnc:public-temp:tunnel:stop
```

Do not leave the public noVNC connector running unnecessarily.

Do not use raw cloudflared diagnostics that may expose secret material.

---

# 29. End-to-end browser verification

A true fresh-device verification is not complete merely because packages are
installed.

The device should eventually demonstrate:

```text
core S22 startup
  -> API reachable
  -> MCP HTTP reachable
  -> OpenAI tunnel-client connected
  -> intended MCP tools reachable from the approved client
  -> browser task starts
  -> worker starts
  -> VNC/Chromium runtime starts
  -> browser snapshot works
  -> protected browser-control handoff starts when requested
  -> Cloudflare Access protected noVNC URL opens
  -> handoff completion stops public connector and local noVNC
  -> persistent Chromium session remains available as designed
  -> unified shutdown returns the runtime to STOPPED
```

Until these are tested on the new device, describe the installation as
configured but not fully proven.

---

# 30. Final shutdown verification

After testing:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:stop
```

Then:

```bash
npm run s22:status
```

Expected final state:

```text
Overall: STOPPED
API 3001: off
MCP 3003: off
OpenAI tmux: off
Tunnel process: off
Browser worker: off
VNC 5901: off
noVNC 6080: off
Public tunnel: off
```

Expected final message from unified shutdown:

```text
PASS: S22 Web Agent fully stopped.
```

---

# 31. Runtime diagnostics

The repository currently provides:

```bash
npm run runtime:doctor
```

This reports runtime evidence such as memory, process counts, PID files, tmux
sessions, and filesystem usage.

It is not a complete installation validator.

The repository also provides a diagnostic watcher:

```bash
npm run runtime:watch:start
npm run runtime:watch:status
npm run runtime:watch:stop
```

Use the watcher when historical runtime evidence is required.

A future `s22:doctor` remains separate future work.

---

# 32. Known limitations and troubleshooting notes

## Hardcoded repository path

Several current helpers assume:

```text
/data/data/com.termux/files/home/projects/mobile-job-radar-agent
```

Use the documented clone path unless a future portability refactor removes this
assumption.

## Android process management

Android may terminate Termux/proot child processes even when ordinary Linux
memory indicators do not show simple RAM exhaustion.

The demonstrated S22 required additional operator-level runtime tuning during
the heaviest full-stack proof.

Do not assume the same tuning is required on every device.

## tmux boundary

tmux protects long-running services from an SSH client disconnect.

tmux does not protect the Termux process group from Android terminating it.

## noVNC cleanup observation

Some historical shutdown paths may leave stale or orphan-looking
proot/websockify processes in process-count diagnostics.

For exposure verification, check the actual listener state and project-owned
tunnel state rather than relying only on old process-count output.

## Saved browser sessions

Saved profile files existing locally do not guarantee that the remote website
session is still valid.

Remote websites may expire, revoke, or challenge sessions.

## Termux distribution

The current verified installation is from Google Play.

Do not migrate to another Termux distribution by default solely because a
future issue appears.

Distribution differences may be considered as a troubleshooting hypothesis for
package, proot, executable/linker, permission, add-on, or dependency behaviour.

---

# 33. Security boundaries

Never request, print, paste, or commit:

- passwords
- cookies
- session tokens
- MFA codes
- storageState contents
- OpenAI runtime API keys
- Cloudflare tunnel tokens
- external tunnel credentials

Keep runtime artifacts out of Git:

```text
.runtime/
data/
reports/
.env
```

Keep these ports local-only:

```text
3001 API
3002 Playwright worker
5901 raw VNC
```

Keep noVNC `6080` local-only by default.

Only expose noVNC through an intentional temporary protected route.

Keep MCP `3003` behind the intended protected MCP connection.

---

# 34. Normal operation after installation

Once the device has been fully configured and verified, normal operation should
remain simple.

One-time secret setup:

```bash
cd ~/projects/mobile-job-radar-agent
npm run s22:secrets:setup
```

Normal start:

```bash
npm run s22:start
```

Status:

```bash
npm run s22:status
```

Normal stop:

```bash
npm run s22:stop
```

Individual service commands should be used only for troubleshooting or
controlled verification.

See:

```text
docs/operator-quickstart.md
docs/manual-service-commands.md
```

for operator guidance.

---

# 35. Reproducibility status

This guide documents the current known-working S22 implementation and the
dependencies observed during documentation closure.

It does not claim that a clean S26 or another Android device has already passed
a complete fresh installation.

The correct future acceptance criterion is:

```text
fresh device configured
+ repository cloned at supported path
+ dependencies installed
+ external tunnel services configured
+ secrets stored safely
+ core startup PASS
+ browser runtime PASS
+ protected human handoff PASS
+ final unified shutdown PASS
= fresh-device reproducibility PASS
```

Until that full sequence is demonstrated on another device, the repository
should describe cross-device installation as documented guidance rather than a
proven automated installation process.
