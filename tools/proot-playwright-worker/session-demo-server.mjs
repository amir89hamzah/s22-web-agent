#!/usr/bin/env node
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const host = process.env.SESSION_DEMO_HOST || '127.0.0.1';
const port = Number(process.env.SESSION_DEMO_PORT || 3107);
const authSecretPath = process.env.SESSION_DEMO_AUTH_SECRET || '.runtime/session-demo-auth-secret';
const authTtlMs = Number(process.env.SESSION_DEMO_AUTH_TTL_MS || 7 * 24 * 60 * 60 * 1000);

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    out[rawKey] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function page(title, body) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="font-family:sans-serif;max-width:720px;margin:40px auto;">
  ${body}
</body>
</html>`;
}

function loadOrCreateAuthSecret() {
  fs.mkdirSync(path.dirname(authSecretPath), { recursive: true });
  if (fs.existsSync(authSecretPath)) {
    const existing = fs.readFileSync(authSecretPath, 'utf8').trim();
    if (existing) return existing;
  }
  const created = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(authSecretPath, created + '\n', { mode: 0o600 });
  fs.chmodSync(authSecretPath, 0o600);
  return created;
}

const authSecret = loadOrCreateAuthSecret();

function signPayload(payload) {
  return crypto.createHmac('sha256', authSecret).update(payload).digest('hex');
}

function makeAuthCookie() {
  const issuedAt = String(Date.now());
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = Buffer.from(`${issuedAt}.${nonce}`, 'utf8').toString('base64url');
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

function isValidAuthCookie(value) {
  if (!value || typeof value !== 'string') return false;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return false;
  const expected = signPayload(payload);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;

  let decoded;
  try {
    decoded = Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return false;
  }

  const [issuedAtRaw] = decoded.split('.');
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;
  return Date.now() - issuedAt <= authTtlMs;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  const cookies = parseCookies(req.headers.cookie || '');

  if (url.pathname === '/' || url.pathname === '/login') {
    if (req.method === 'GET') {
      return send(res, 200, page('S22 Demo Login', `
        <h1>S22 Demo Login</h1>
        <p>This is a local-only demo login page for Session Gateway proof.</p>
        <p>Username: <b>akmal</b></p>
        <p>Password: <b>demo123</b></p>
        <form method="post" action="/login">
          <label>Username <input name="username" autocomplete="username"></label><br><br>
          <label>Password <input name="password" type="password" autocomplete="current-password"></label><br><br>
          <button type="submit">Login</button>
        </form>
      `));
    }

    if (req.method === 'POST') {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
        if (data.length > 2048) req.destroy();
      });
      req.on('end', () => {
        const form = new URLSearchParams(data);
        const username = form.get('username');
        const password = form.get('password');

        if (username === 'akmal' && password === 'demo123') {
          const ticket = makeAuthCookie();
          return send(res, 302, 'redirecting', {
            'set-cookie': `s22_demo_session=${ticket}; HttpOnly; SameSite=Lax; Path=/`,
            location: '/secure',
          });
        }

        return send(res, 401, page('S22 Demo Login Failed', `
          <h1>Login failed</h1>
          <p>Try username <b>akmal</b> and password <b>demo123</b>.</p>
          <a href="/login">Back to login</a>
        `));
      });
      return;
    }
  }

  if (url.pathname === '/secure') {
    if (!isValidAuthCookie(cookies.s22_demo_session)) {
      return send(res, 302, 'redirecting', { location: '/login' });
    }

    return send(res, 200, page('S22 Demo Secure Area', `
      <h1>S22 DEMO AUTH PASS</h1>
      <p>Welcome to the protected local demo page.</p>
      <p>If headless reuse can read this page, Session Gateway proof is working.</p>
    `));
  }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 's22-session-demo', port, persistentAuth: true }));
    return;
  }

  send(res, 404, page('Not Found', '<h1>Not Found</h1>'));
});

server.listen(port, host, () => {
  console.log(`S22 demo login server listening at http://${host}:${port}`);
  console.log('Login: akmal / demo123');
  console.log('Persistent demo auth: enabled');
  console.log(`Demo auth secret path: ${authSecretPath}`);
  console.log('No auth ticket values are printed.');
});
