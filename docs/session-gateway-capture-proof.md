# Phase 7C-2 — Session Capture Mode Proof

Status: PASS  
Phase: User-Controlled Session Gateway / Option B

## Purpose

This proof adds a visible Playwright capture helper that runs Chromium inside the existing local-only VNC desktop.

The first proof used `https://example.com/` and a dummy profile. Real website login is still later.

## Commands

From Termux repo root:

```bash
npm run session:capture:example
```

This starts local-only VNC, opens visible Chromium, and waits for the user to press Enter in the terminal. When Enter is pressed, the helper saves:

```text
.runtime/sessions/example-proof/storageState.json
.runtime/sessions/example-proof/metadata.json
```

Check profile status without printing secrets:

```bash
npm run session:capture:status
```

Stop VNC after the proof:

```bash
npm run session:vnc:stop
```

## Manual flow

1. Run `npm run session:capture:example`.
2. Open AVNC on S22.
3. Connect to `127.0.0.1:5901`.
4. Confirm Chromium opens `https://example.com/`.
5. Return to the SSH terminal.
6. Press Enter to save `storageState.json`.
7. Run `npm run session:capture:status`.
8. Run `npm run session:vnc:stop`.

## Safety rules

- No password in ChatGPT.
- No cookie value in ChatGPT.
- No session token in ChatGPT.
- No `storageState.json` content in ChatGPT.
- No raw VNC exposure to public networks.
- Use local VNC only.
- Stop VNC after capture.
- Use safe profile names only.
- Do not accept arbitrary file paths from MCP prompts.

## Expected result

The proof passes when:

- Visible Chromium opens inside AVNC.
- `storageState.json` is created under `.runtime/sessions/example-proof/`.
- `metadata.json` is created under `.runtime/sessions/example-proof/`.
- `git status --short` does not show `.runtime/` session artifacts.
- VNC is stopped after the proof.

## Notes

`storageState.json` may be small for `example.com` because no real login occurs. That is acceptable for this proof. The purpose is to validate the capture mechanism and filesystem safety before trying a real target website.
