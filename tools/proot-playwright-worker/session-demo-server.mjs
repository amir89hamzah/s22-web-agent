#!/usr/bin/env node

import http from 'node:http';
import crypto from 'node:crypto';

const host = process.env.SESSION_DEMO_HOST || '127.0.0.1';
const port = Number(process.env.SESSION_DEMO_PORT || 3107);

const sessions = new Set();

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
          const sid = crypto.randomBytes(18).toString('hex');
          sessions.add(sid);
          return send(res, 302, 'redirecting', {
            'set-cookie': `s22_demo_session=${sid}; HttpOnly; SameSite=Lax; Path=/`,
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
    if (!cookies.s22_demo_session || !sessions.has(cookies.s22_demo_session)) {
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
    res.end(JSON.stringify({ ok: true, service: 's22-session-demo', port }));
    return;
  }

  send(res, 404, page('Not Found', '<h1>Not Found</h1>'));
});

server.listen(port, host, () => {
  console.log(`S22 demo login server listening at http://${host}:${port}`);
  console.log('Login: akmal / demo123');
});
