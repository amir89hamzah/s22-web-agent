# Phase 7G — Pre-login Cleanup

Phase 7G is a safety and documentation phase before any real external login is tested.

## Current baseline

- Phase 7F completed.
- Latest known main/origin main checkpoint: `fe5ee2b` — `Document Phase 7F MCP profile scan test`.
- MCP tool added: `browser_scan_with_profile`.
- Local demo test passed with profile `local-login-demo` and URL `http://127.0.0.1:3107/secure`.
- Expected text `S22 DEMO AUTH PASS` was found.
- No cookie/session values were printed.
- External real login has not been tested yet.

## Safety boundary

`browser_scan_with_profile` is intentionally narrow.

Allowed input fields:

- `profile`
- `url`
- `expectedText` optional

Prohibited input fields:

- `password`
- `cookie`
- `cookies`
- `token`
- `session`
- `storageState`
- `storageStatePath`
- raw browser profile path
- raw JSON session export

The MCP tool should call the local script boundary only and must not expose secrets through MCP arguments.

## Runtime boundary

For pre-login and first login work:

- Use local-only workflow first.
- Keep API `3001` local-only.
- Keep Playwright worker `3002` local-only.
- Keep MCP HTTP `3003` local-only unless auth is enabled and the public tunnel is intentionally started.
- Do not run a public tunnel while MCP auth is disabled.

## Log hygiene

Logs may show:

- selected profile name
- target URL
- page title
- expected text found or not found
- PASS/FAIL status

Logs must not show:

- cookies
- passwords
- bearer tokens
- local storage values
- session storage values
- storageState JSON
- raw profile contents

## Real external login gate

Before Phase 7H real external login:

1. Confirm `.gitignore` excludes session/profile artifacts.
2. Confirm `browser_scan_with_profile` only accepts `profile`, `url`, and optional `expectedText`.
3. Confirm local demo profile scan still passes.
4. Confirm no cookie/session/token/password is printed by script or MCP response.
5. Confirm public tunnel is stopped.
6. Confirm MCP auth is enabled before any future public exposure.

## Phase 7G exit criteria

Phase 7G is complete when:

- this document exists;
- `.gitignore` contains session/profile safety rules;
- TODO/checkpoint is updated;
- local profile scan safety is rechecked;
- repo is clean;
- main is pushed;
- real external login is still not tested.

## Next phase

Phase 7H should be the first controlled real external login trial.

Recommended Phase 7H direction:

- manual login through local VNC/browser only;
- save profile locally on S22/Debian proot only;
- scan a logged-in page using profile name only;
- never pass secrets through ChatGPT or MCP arguments;
- keep public tunnel off during the first trial.
