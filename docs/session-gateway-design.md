# Phase 7A — User-Controlled Session Gateway Design

Status: design locked for review  
Phase name: User-Controlled Session Gateway  
Primary goal: let the user capture and reuse website login state without sending passwords, cookies, session tokens, or storage files to ChatGPT.

## 1. Architecture overview

Phase 7 adds a user-controlled session layer beside the existing S22 Web Agent runtime.

Current proven runtime paths remain unchanged:

- ChatGPT Custom App → OpenAI Secure MCP Tunnel → Debian proot `tunnel-client` → Termux MCP HTTP `3003` → API `3001` → SQLite/report.
- Route A Cloudflare mode remains separate: public hostname → MCP HTTP `3003` only.

Phase 7 does not expose API `3001` or Playwright worker `3002` publicly. It also does not add heavy scanner logic. It only defines how login state may be captured and stored locally for later headless scans.

The session gateway stores named browser profiles under:

```text
.runtime/sessions/<profile>/
```

A future scan should reference only a safe profile name, not an arbitrary file path. The scanner or worker resolves that profile name internally to a known local session file.

Expected future shape:

```text
User manual login / cookie import
        ↓
.runtime/sessions/<profile>/storageState.json
        ↓
Headless Playwright scan uses storageState
        ↓
Report/SQLite output, with no cookie/session values logged
```

## 2. OAuth is separate and later

OAuth is deliberately not part of Phase 7A.

OAuth and browser session capture solve different problems:

- OAuth controls who may access the S22 MCP tools or a future application API.
- Cookie/session/storageState controls whether Playwright is already logged in to a target website.

For example, OAuth could later protect the S22 agent itself. It would not automatically log Playwright in to LinkedIn, Rockwell, vendor portals, or other target websites. Those target websites still need their own session state.

OAuth may be useful later for multi-user access, identity, authorization, or audit logging. For now, the project stays simpler: no passwords in ChatGPT, no OAuth flow, and no target-site credentials handled by the assistant.

## 3. Session concepts

### 3.1 OAuth access control

OAuth means identity and permission for using the S22 MCP tools.

Examples:

- Allow only the owner to call MCP tools.
- Grant or revoke access to a web dashboard.
- Add account-level audit logs.

OAuth does not equal target-site login state.

### 3.2 Cookie/session/storageState for target websites

Cookie/session/storageState means browser login state for a website that Playwright visits.

Examples:

- A user manually logs in to a target website in Chromium.
- Playwright saves cookies plus relevant origin storage into `storageState.json`.
- Later headless scans reuse that state without asking for the password again.

This is sensitive runtime data and must stay local on the S22/Debian environment.

## 4. Option A — Cookie JSON Import via Download folder

Status: deferred / later. Useful for lightweight proof only.

### 4.1 Flow

1. User exports cookie JSON from a trusted browser/tool.
2. User places the exported JSON file into the Android Download folder.
3. A local import helper treats Download as an inbox.
4. The helper validates filename, target domain, and profile name.
5. The helper copies/imports the result into:

   ```text
   .runtime/sessions/<profile>/
   ```

6. Future Playwright scan uses the named profile.

### 4.2 Why it is useful

This path is lightweight because it avoids running a visible browser on the S22. It can prove the storage and profile concept quickly.

It may be enough for simple websites that depend mainly on cookies.

### 4.3 Limitations

Cookie JSON import is less reliable than full Playwright `storageState` capture because:

- User-agent mismatch can invalidate or weaken the session.
- `localStorage` and `sessionStorage` may be missing.
- Some websites bind sessions to device, browser, IP, TLS/browser fingerprint, or recent challenge state.
- Android browser extension support is uncertain and depends on the browser/tool used.
- Cookie export formats vary between tools.
- Importing cookies alone may not recreate a real logged-in browser context.

### 4.4 Safety boundary

Cookie JSON must never be pasted into ChatGPT and must never be committed to git. The assistant should only receive a profile name and target domain, not raw cookie values.

## 5. Option B — Playwright Manual Login via VNC / Session Capture Mode

Status: preferred practical path after Phase 7A design review.

Option B is more reliable because Playwright itself creates the browser context and saves `storageState` after the user logs in manually.

### 5.1 Flow

1. Debian proot starts a temporary visible Chromium/Playwright session.
2. A local GUI/VNC session is opened only for the capture window.
3. User controls the browser from the S22 using an Android VNC client.
4. User logs in manually to the target website.
5. Playwright saves:

   ```text
   .runtime/sessions/<profile>/storageState.json
   ```

6. GUI/VNC is closed after capture.
7. Future scans run headless using the saved `storageState.json`.

### 5.2 Default access mode

Default: local VNC on the S22 only.

The user should operate the browser locally through Android VNC Viewer, bVNC, AVNC, or equivalent. Raw VNC should not be exposed publicly.

### 5.3 Optional later remote mode

noVNC/websockify through a temporary Cloudflare link may be considered later, but only with strong protection such as Cloudflare Access or equivalent authentication.

This optional remote mode is not part of the first implementation.

Rules for any later remote mode:

- Do not expose raw VNC publicly.
- Use short-lived access.
- Use strong authentication before the browser UI.
- Stop noVNC, VNC, and tunnel immediately after capture.
- Never put target-site credentials, cookies, or session files into ChatGPT.

### 5.4 Why Option B is preferred

Option B captures the login state from the same browser family that will later run the scan. It can include cookies and origin storage in a Playwright-supported format.

This reduces the mismatch risk seen in cookie-only import.

## 6. Required software for Option B

Baseline components:

- Debian proot on Termux.
- Chromium inside Debian proot.
- Playwright inside Debian proot.
- Lightweight desktop or X/VNC only if needed.
- TigerVNC or equivalent VNC server.
- Android VNC Viewer, bVNC, AVNC, or equivalent for local control.

Optional later components:

- noVNC.
- websockify.
- Cloudflare temporary hostname/tunnel with Cloudflare Access or equivalent protection.

The GUI stack should be treated as a temporary capture tool, not a permanent scanning service.

## 7. Security rules

Hard rules:

- No password in ChatGPT.
- No cookie value in ChatGPT.
- No session token in ChatGPT.
- No `storageState.json` content in ChatGPT.
- No cookie/session/storageState file in git.
- Do not log cookie values.
- Do not log authorization headers or session tokens.
- Use named session profiles only.
- Do not accept arbitrary file paths from MCP prompts.
- Resolve profile names to known local directories internally.
- Use a domain allowlist per profile.
- Do not expose raw VNC publicly.
- Stop VNC/tunnel/noVNC after capture.
- Keep API `3001` and Playwright worker `3002` local-only.
- Public tunnel modes must expose only MCP HTTP `3003` when required.

Recommended profile metadata for future implementation:

```json
{
  "profile": "example-profile",
  "allowedDomains": ["example.com"],
  "storageStatePath": ".runtime/sessions/example-profile/storageState.json",
  "createdBy": "manual-vnc-capture",
  "notes": "Do not commit. Do not paste into ChatGPT."
}
```

The metadata is safe only if it does not contain cookie values, credentials, tokens, or full sensitive browser storage.

## 8. Lightweight runtime rule

S22 resources are limited. Phase 7 must avoid turning the phone into a permanently running browser desktop.

Rules:

- GUI/VNC is used temporarily during capture only.
- Normal scans should stay headless.
- Avoid background browser automation that heats the S22.
- Avoid long-running Chromium sessions when not actively needed.
- Prefer explicit start/status/stop helpers.
- Keep capture mode separate from scan mode.

## 9. Proposed future implementation stages

### Phase 7A — Design doc

- Create this design document.
- Update TODO roadmap.
- Update `llm-index.yaml`.
- Update `.gitignore` for runtime session artifacts.

### Phase 7B — Cookie JSON proof

Status: deferred / later.

Possible later proof:

- Add a local-only import helper.
- Validate profile name and domain.
- Copy cookie JSON from Download inbox.
- Convert or store under `.runtime/sessions/<profile>/`.
- Demonstrate that secrets do not enter git or ChatGPT.

### Phase 7C — Session Capture Mode

Preferred next practical implementation after design is accepted.

Possible implementation:

- Add Debian proot helper script to start temporary VNC capture mode.
- Launch visible Chromium/Playwright context.
- User logs in manually through local VNC on S22.
- Save Playwright `storageState.json` to `.runtime/sessions/<profile>/`.
- Stop GUI/VNC after capture.

### Phase 7D — Headless reuse

Possible implementation:

- Add allowlisted profile lookup.
- Run headless scan using stored `storageState.json`.
- Ensure reports never include cookie/session values.
- Add status command that shows profile names and domains only, not secrets.

## 10. Non-goals for Phase 7A

Phase 7A does not:

- Implement OAuth.
- Implement public noVNC.
- Add heavy scanner logic.
- Store credentials.
- Ask ChatGPT to handle cookies or session files.
- Expose API `3001` or worker `3002`.
- Keep a GUI browser running in the background.
