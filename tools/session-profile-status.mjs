#!/usr/bin/env node

import process from 'node:process';
import {
  PROFILE_STATES,
  exitCodeForState,
  inspectProfile,
} from './session-profile-common.mjs';

function printResult(result) {
  console.log(`state: ${result.state}`);
  console.log(`profile: ${result.profile || '(none)'}`);

  if (result.targetDisplayUrl) console.log(`targetUrl: ${result.targetDisplayUrl}`);
  if (result.targetHost) console.log(`targetHost: ${result.targetHost}`);
  if (Array.isArray(result.allowedDomains)) {
    console.log(`allowedDomains: ${result.allowedDomains.join(', ') || '(none)'}`);
  }

  if (typeof result.storageStatePresent === 'boolean') {
    console.log(`storageState: ${result.storageStatePresent ? 'present' : 'missing'}`);
  }
  if (typeof result.metadataPresent === 'boolean') {
    console.log(`metadata: ${result.metadataPresent ? 'present' : 'missing'}`);
  }
  if (Array.isArray(result.missingArtifacts) && result.missingArtifacts.length > 0) {
    console.log(`missingArtifacts: ${result.missingArtifacts.join(', ')}`);
  }

  console.log(`reason: ${result.reason || 'unknown'}`);
  console.log(`message: ${result.message || 'no message'}`);

  if (result.state === PROFILE_STATES.PRESENT_UNVERIFIED) {
    console.log('next: run session:profile:probe with an authenticated URL and expected text.');
  } else if (result.state === PROFILE_STATES.MISSING) {
    console.log('next: create or refresh the profile through a human-controlled local manual login.');
  } else if (result.state === PROFILE_STATES.DOMAIN_MISMATCH) {
    console.log('next: use a profile captured for this target domain or choose the correct profile.');
  }

  console.log('No cookie/session/token/password/MFA/storageState values were printed.');
}

async function main() {
  const [profile, rawTargetUrl = ''] = process.argv.slice(2);

  if (!profile) {
    printResult({
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'profile_required',
      message: 'usage: node tools/session-profile-status.mjs <profile> [target-url]',
      profile: '',
    });
    process.exitCode = exitCodeForState(PROFILE_STATES.RUNTIME_ERROR);
    return;
  }

  const repoRoot = process.env.SESSION_REPO_ROOT || process.cwd();
  const result = await inspectProfile({ repoRoot, profile, rawTargetUrl });
  printResult(result);
  process.exitCode = exitCodeForState(result.state);
}

main().catch((error) => {
  printResult({
    state: PROFILE_STATES.RUNTIME_ERROR,
    reason: 'unhandled_status_error',
    message: error?.name || 'unknown error',
    profile: process.argv[2] || '',
  });
  process.exitCode = exitCodeForState(PROFILE_STATES.RUNTIME_ERROR);
});
