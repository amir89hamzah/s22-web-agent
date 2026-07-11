import fs from 'node:fs/promises';
import path from 'node:path';

export const SAFE_PROFILE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export const PROFILE_STATES = Object.freeze({
  MISSING: 'missing',
  PRESENT_UNVERIFIED: 'present_unverified',
  VALID: 'valid',
  EXPIRED_OR_LOGGED_OUT: 'expired_or_logged_out',
  DOMAIN_MISMATCH: 'domain_mismatch',
  RUNTIME_ERROR: 'runtime_error',
});

export const PROFILE_EXIT_CODES = Object.freeze({
  [PROFILE_STATES.PRESENT_UNVERIFIED]: 0,
  [PROFILE_STATES.VALID]: 0,
  [PROFILE_STATES.MISSING]: 20,
  [PROFILE_STATES.EXPIRED_OR_LOGGED_OUT]: 21,
  [PROFILE_STATES.DOMAIN_MISMATCH]: 22,
  [PROFILE_STATES.RUNTIME_ERROR]: 23,
});

export function exitCodeForState(state) {
  return PROFILE_EXIT_CODES[state] ?? PROFILE_EXIT_CODES[PROFILE_STATES.RUNTIME_ERROR];
}

export function normalizeAllowedDomain(value) {
  if (typeof value !== 'string') return '';

  const raw = value.trim().toLowerCase();
  if (!raw) return '';

  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return raw
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .trim()
      .toLowerCase();
  }
}

export function getAllowedDomains(metadata) {
  const values = [];

  if (Array.isArray(metadata?.allowedDomains)) values.push(...metadata.allowedDomains);
  if (Array.isArray(metadata?.allowed_domains)) values.push(...metadata.allowed_domains);
  if (metadata?.allowedDomain) values.push(metadata.allowedDomain);
  if (metadata?.allowed_domain) values.push(metadata.allowed_domain);

  return [...new Set(values.map(normalizeAllowedDomain).filter(Boolean))];
}

export function safeUrlForDisplay(urlValue) {
  try {
    const url = urlValue instanceof URL ? new URL(urlValue.href) : new URL(String(urlValue));
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '(invalid URL)';
  }
}

export function sanitizeErrorMessage(message) {
  const raw = String(message || 'unknown error');
  const redactedUrls = raw.replace(/https?:\/\/[^\s)"']+/gi, (candidate) => safeUrlForDisplay(candidate));
  return redactedUrls.replace(/\s+/g, ' ').trim().slice(0, 400);
}

async function inspectFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return { state: 'error', reason: 'not_a_file' };
    }
    return { state: 'present' };
  } catch (error) {
    if (error?.code === 'ENOENT') return { state: 'missing' };
    return { state: 'error', reason: error?.code || error?.name || 'filesystem_error' };
  }
}

async function readJsonWithoutContent(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function parseTargetUrl(rawTargetUrl) {
  if (!rawTargetUrl) return { url: null };

  let targetUrl;
  try {
    targetUrl = new URL(rawTargetUrl);
  } catch {
    return {
      error: {
        state: PROFILE_STATES.RUNTIME_ERROR,
        reason: 'invalid_target_url',
        message: 'target URL is invalid',
      },
    };
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return {
      error: {
        state: PROFILE_STATES.RUNTIME_ERROR,
        reason: 'unsupported_target_protocol',
        message: 'target URL must use http or https',
      },
    };
  }

  if (targetUrl.username || targetUrl.password) {
    return {
      error: {
        state: PROFILE_STATES.RUNTIME_ERROR,
        reason: 'embedded_url_credentials_forbidden',
        message: 'target URL must not contain embedded username or password',
      },
    };
  }

  return { url: targetUrl };
}

export async function inspectProfile({ repoRoot, profile, rawTargetUrl = '' }) {
  if (!SAFE_PROFILE_RE.test(String(profile || ''))) {
    return {
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'invalid_profile_name',
      message: 'profile name is invalid',
      profile: String(profile || ''),
    };
  }

  const parsedTarget = parseTargetUrl(rawTargetUrl);
  if (parsedTarget.error) {
    return {
      ...parsedTarget.error,
      profile,
    };
  }

  const sessionDir = path.join(repoRoot, '.runtime', 'sessions', profile);
  const storageStatePath = path.join(sessionDir, 'storageState.json');
  const metadataPath = path.join(sessionDir, 'metadata.json');

  const [storageFile, metadataFile] = await Promise.all([
    inspectFile(storageStatePath),
    inspectFile(metadataPath),
  ]);

  if (storageFile.state === 'error' || metadataFile.state === 'error') {
    return {
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'profile_artifact_filesystem_error',
      message: 'one or more profile artifacts could not be inspected',
      profile,
      storageStatePresent: storageFile.state === 'present',
      metadataPresent: metadataFile.state === 'present',
    };
  }

  const missingArtifacts = [];
  if (storageFile.state === 'missing') missingArtifacts.push('storageState.json');
  if (metadataFile.state === 'missing') missingArtifacts.push('metadata.json');

  if (missingArtifacts.length > 0) {
    return {
      state: PROFILE_STATES.MISSING,
      reason: 'profile_artifacts_missing',
      message: 'required profile artifacts are missing',
      profile,
      missingArtifacts,
      storageStatePresent: storageFile.state === 'present',
      metadataPresent: metadataFile.state === 'present',
    };
  }

  let storageState;
  let metadata;
  try {
    [storageState, metadata] = await Promise.all([
      readJsonWithoutContent(storageStatePath),
      readJsonWithoutContent(metadataPath),
    ]);
  } catch (error) {
    return {
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'profile_artifact_invalid_json',
      message: sanitizeErrorMessage(error?.message),
      profile,
      storageStatePresent: true,
      metadataPresent: true,
    };
  }

  if (!storageState || typeof storageState !== 'object' || Array.isArray(storageState)) {
    return {
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'storage_state_invalid_shape',
      message: 'storageState JSON must be an object',
      profile,
      storageStatePresent: true,
      metadataPresent: true,
    };
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'metadata_invalid_shape',
      message: 'metadata JSON must be an object',
      profile,
      storageStatePresent: true,
      metadataPresent: true,
    };
  }

  const allowedDomains = getAllowedDomains(metadata);
  if (allowedDomains.length === 0) {
    return {
      state: PROFILE_STATES.RUNTIME_ERROR,
      reason: 'metadata_allowed_domain_missing',
      message: 'metadata does not contain an allowed domain',
      profile,
      storageStatePresent: true,
      metadataPresent: true,
    };
  }

  const targetUrl = parsedTarget.url;
  const targetHost = targetUrl?.hostname.toLowerCase() || '';
  const matchedAllowedDomain = targetHost
    ? allowedDomains.find((domain) => domain === targetHost)
    : '';

  if (targetHost && !matchedAllowedDomain) {
    return {
      state: PROFILE_STATES.DOMAIN_MISMATCH,
      reason: 'target_domain_not_allowlisted',
      message: 'target host is not in the profile domain allowlist',
      profile,
      targetHost,
      targetDisplayUrl: safeUrlForDisplay(targetUrl),
      allowedDomains,
      storageStatePresent: true,
      metadataPresent: true,
    };
  }

  return {
    state: PROFILE_STATES.PRESENT_UNVERIFIED,
    reason: 'profile_artifacts_present',
    message: 'profile artifacts are present, but remote website validity has not been verified',
    profile,
    targetHost,
    targetUrl,
    targetDisplayUrl: targetUrl ? safeUrlForDisplay(targetUrl) : '',
    matchedAllowedDomain,
    allowedDomains,
    storageStatePresent: true,
    metadataPresent: true,
    storageStatePath,
    metadataPath,
  };
}
