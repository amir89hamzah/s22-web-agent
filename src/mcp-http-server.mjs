#!/usr/bin/env node

import http from 'http';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createS22McpServer } from './mcp-core.mjs';
import { registerBrowserTaskTools } from './mcp-browser-task-tools.mjs';

const HOST = process.env.MCP_HTTP_HOST || '127.0.0.1';
const PORT = Number(process.env.MCP_HTTP_PORT || 3003);
const MCP_PATH = process.env.MCP_HTTP_PATH || '/mcp';
const AUTH_TOKEN = process.env.MCP_HTTP_TOKEN || '';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

if (!LOOPBACK_HOSTS.has(HOST) && !AUTH_TOKEN) {
  console.error(`FATAL: MCP_HTTP_TOKEN is required when binding MCP HTTP to non-loopback host ${HOST}.`);
  console.error('Use 127.0.0.1 for unauthenticated local-only testing, or provide a strong bearer token.');
  process.exit(1);
}

const sessions = new Map();

function setCommonHeaders(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader(
    'access-control-allow-headers',
    'content-type, authorization, mcp-session-id, mcp-protocol-version, last-event-id, accept'
  );
  res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
}

function sendJson(res, statusCode, body) {
  setCommonHeaders(res);
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

function isAuthorized(req) {
  if (!AUTH_TOKEN) {
    return true;
  }

  return req.headers.authorization === `Bearer ${AUTH_TOKEN}`;
}

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;

      if (raw.length > 5_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

async function createSession() {
  const mcpServer = createS22McpServer({
    includeLegacyBrowserTools: false,
  });
  registerBrowserTaskTools(mcpServer);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, {
        transport,
        mcpServer,
      });

      console.error(`[mcp-http] session initialized: ${sessionId}`);
    },
  });

  transport.onerror = (error) => {
    console.error('[mcp-http] transport error:', error);
  };

  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
      console.error(`[mcp-http] session closed: ${transport.sessionId}`);
    }
  };

  await mcpServer.connect(transport);
  return transport;
}

async function handleMcpRequest(req, res) {
  const sessionId = getHeader(req, 'mcp-session-id');

  if (req.method === 'GET' || req.method === 'DELETE') {
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
      sendJson(res, 404, {
        ok: false,
        error: 'MCP session not found. Call initialize first.',
      });
      return;
    }

    await session.transport.handleRequest(req, res);
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      ok: false,
      error: 'Method not allowed',
    });
    return;
  }

  const body = await readJsonBody(req);

  let transport;

  if (sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
      sendJson(res, 404, {
        ok: false,
        error: 'MCP session not found. Call initialize again.',
      });
      return;
    }

    transport = session.transport;
  } else if (body?.method === 'initialize') {
    transport = await createSession();
  } else {
    sendJson(res, 400, {
      ok: false,
      error: 'Missing MCP session. Call initialize first and reuse mcp-session-id.',
    });
    return;
  }

  await transport.handleRequest(req, res, body);
}

const httpServer = http.createServer(async (req, res) => {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

  if (requestUrl.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 's22-web-agent-mcp-http',
      transport: 'streamable-http',
      mode: 'stateful',
      sessions: sessions.size,
      mcpPath: MCP_PATH,
      auth: AUTH_TOKEN ? 'enabled' : 'disabled',
      bindScope: LOOPBACK_HOSTS.has(HOST) ? 'loopback' : 'all_interfaces',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (requestUrl.pathname !== MCP_PATH) {
    sendJson(res, 404, {
      ok: false,
      error: 'Not found',
      mcpPath: MCP_PATH,
    });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, {
      ok: false,
      error: 'Unauthorized',
    });
    return;
  }

  try {
    await handleMcpRequest(req, res);
  } catch (error) {
    console.error('[mcp-http] request error:', error);

    if (!res.headersSent) {
      sendJson(res, 500, {
        ok: false,
        error: error?.message || String(error),
      });
    } else {
      res.end();
    }
  }
});

httpServer.listen(PORT, HOST, () => {
  console.error(`S22 MCP HTTP server listening on http://${HOST}:${PORT}${MCP_PATH}`);
  console.error(`Health check: http://${HOST}:${PORT}/health`);
  console.error('Mode: stateful sessions');
  console.error(`Bind scope: ${LOOPBACK_HOSTS.has(HOST) ? 'loopback' : 'all interfaces'}`);

  if (!AUTH_TOKEN) {
    console.error('Auth: disabled for local development');
  } else {
    console.error('Auth: bearer token enabled');
  }
});
