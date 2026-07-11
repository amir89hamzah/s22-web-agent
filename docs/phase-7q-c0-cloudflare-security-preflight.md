# Phase 7Q-C0 — Cloudflare Security Preflight

## Status

Implemented in the repository. Operator Cloudflare dashboard confirmation and live S22 preflight are pending.

Phase 7Q-C0 is a safety gate before Phase 7Q-C may expose temporary noVNC through Cloudflare.

It does not start VNC, noVNC, cloudflared, a tunnel, or a public route.

## Why this phase exists

The final authenticated-task flow will eventually be:

```text
ChatGPT prepares authenticated task
  -> saved profile is expired or missing
  -> state: login_required
  -> user explicitly approves a temporary login gateway
  -> protected Cloudflare hostname becomes reachable
  -> user logs in through noVNC
  -> profile is captured and verified
  -> temporary services stop
  -> original task resumes
```

Before building that flow, the project must prove:

- the historical tunnel token is no longer trusted
- the login hostname is separate from the MCP hostname
- Cloudflare Access protects the login hostname
- the Access policy is restricted to the operator's exact email/account
- the cloudflared connector remains stopped during preflight
- noVNC remains local and stopped during preflight
- no token value is printed or passed through ChatGPT/MCP

## Existing host separation

```text
MCP hostname:
  s22agent.aidesk.rest -> 127.0.0.1:3003

Temporary login hostname:
  s22login.aidesk.rest -> 127.0.0.1:6080
```

These hostnames must remain separate.

Ports `3001`, `3002`, and raw VNC `5901` must never be published.

## Operator action required in Cloudflare

Do not start the connector yet.

In the Cloudflare dashboard:

1. Locate the remotely managed tunnel intended for the temporary login gateway.
2. Replace the historical connector token:
   - use the dashboard's regenerate/rotate token control if available, or
   - create a new dedicated remotely managed tunnel for the login gateway.
3. Keep or create the published application route:

   ```text
   s22login.aidesk.rest -> http://127.0.0.1:6080
   ```

4. In Cloudflare Access, locate or create the self-hosted web application for:

   ```text
   s22login.aidesk.rest
   ```

5. Use an `Allow` policy with an `Include` rule for the operator's exact email/account.
6. Remove broad rules such as `Everyone`, an entire public email domain, or all valid one-time-pin users.
7. Save the application and policy.
8. Keep the cloudflared connector stopped.

Never paste the new tunnel token into ChatGPT, MCP, project documentation, screenshots, or Git.

The token should be entered only in the local S22 shell when a later approved public proof starts.

## Automated preflight command

```bash
npm run auth:gateway:cloudflare:preflight -- s22login.aidesk.rest
```

The helper checks:

- `curl`, `tmux`, and `cloudflared` exist
- the public-temp tunnel tmux session is stopped
- no `cloudflared` process is running
- `CLOUDFLARE_TUNNEL_TOKEN` is not exported
- no temporary token file remains under `.runtime/`
- local noVNC is not reachable on `127.0.0.1:6080`
- the public hostname presents a Cloudflare Access login challenge
- the login hostname is not the MCP hostname

The helper does not display response headers or redirect URLs because those may contain unnecessary request details.

## Result states

### `local_safe_and_access_front_door_detected`

Automated local safety checks passed and an Access login challenge was detected from the public hostname.

This does not prove the tunnel token was rotated. The operator must separately confirm token replacement in the dashboard.

Exit code: `0`

### `operator_action_required`

Examples:

- Access redirect was not detected
- hostname or Access application is not configured
- token remains exported in the current shell
- local noVNC is still running

Exit code: `21`

### `unsafe_or_incomplete`

Examples:

- a cloudflared connector is already running unexpectedly
- public content returns HTTP 200 without an Access challenge
- a temporary token file remains
- a required command is missing
- login and MCP hostnames are the same

Exit code: `23`

## Expected S22 verification

After the Cloudflare dashboard changes are complete, run:

```bash
cd ~/projects/mobile-job-radar-agent

git pull --ff-only

git log -1 --oneline

bash -n scripts/auth-gateway-cloudflare-preflight.sh

npm run session:novnc:public-temp:tunnel:status

npm run auth:gateway:cloudflare:preflight -- s22login.aidesk.rest

git status --short
```

Expected safe outcome:

```text
PASS: curl found
PASS: tmux found
PASS: cloudflared found
PASS: public-temp tunnel tmux session is not running
PASS: no cloudflared process is running
PASS: CLOUDFLARE_TUNNEL_TOKEN is not exported in this shell
PASS: no temporary tunnel token file remains
PASS: local noVNC is not reachable
PASS: Cloudflare Access login challenge detected
PREFLIGHT RESULT: local_safe_and_access_front_door_detected
```

The final `git status --short` should produce no output.

## Acceptance decision

Do not begin Phase 7Q-C public gateway orchestration until all of the following are confirmed:

- historical tunnel token replaced
- exact login hostname route confirmed
- exact-email Access Allow policy confirmed
- no broad Access policy remains
- preflight exit code is `0`
- tunnel, VNC, and noVNC remain stopped after preflight
- no secret value was printed
- Git working tree remains clean
