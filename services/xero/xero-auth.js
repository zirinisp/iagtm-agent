/**
 * Xero OAuth2 Authorization Code Flow — One-time setup
 *
 * Run this once to authorize the app and obtain access + refresh tokens.
 * Tokens are saved to tokens.json for use by xero-client.js.
 *
 * Usage: node services/xero/xero-auth.js
 */

import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: `${__dirname}/.env` });

const {
  XERO_CLIENT_ID,
  XERO_CLIENT_SECRET,
  XERO_TOKEN_URL,
  XERO_AUTH_URL,
  XERO_REDIRECT_URI,
  XERO_SCOPES,
} = process.env;

const TOKEN_FILE = join(__dirname, 'tokens.json');

async function exchangeCodeForTokens(code) {
  const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: XERO_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function getConnections(accessToken) {
  const response = await fetch('https://api.xero.com/connections', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Connections request failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function saveTokens(tokens, tenantId) {
  const data = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    token_type: tokens.token_type,
    scope: tokens.scope,
    obtained_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    tenant_id: tenantId,
  };
  await writeFile(TOKEN_FILE, JSON.stringify(data, null, 2));
  return data;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p>`);
        console.error(`\nAuthorization failed: ${error}`);
        server.close();
        reject(new Error(error));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Missing authorization code</h1>');
        return;
      }

      try {
        console.log('\nReceived authorization code, exchanging for tokens...');

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);
        console.log(`Access token obtained (expires in ${tokens.expires_in}s)`);

        // Get tenant ID from connections
        console.log('Fetching tenant connections...');
        const connections = await getConnections(tokens.access_token);

        if (!connections || connections.length === 0) {
          throw new Error('No tenant connections found. Make sure the app is connected to an organisation.');
        }

        const tenant = connections[0];
        console.log(`Tenant: ${tenant.tenantName} (${tenant.tenantId})`);

        if (connections.length > 1) {
          console.log(`\nNote: ${connections.length} connections found. Using first one.`);
          for (const conn of connections) {
            console.log(`  - ${conn.tenantName} (${conn.tenantId})`);
          }
        }

        // Save tokens + tenant ID
        const saved = await saveTokens(tokens, tenant.tenantId);
        console.log(`\nTokens saved to ${TOKEN_FILE}`);
        console.log(`  Access token expires at: ${saved.expires_at}`);
        console.log(`  Refresh token: present (rotating, 60-day expiry if unused)`);
        console.log(`  Tenant ID: ${saved.tenant_id}`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 60px;">
              <h1>Xero Authorization Successful</h1>
              <p>Tokens saved. You can close this window.</p>
              <p>Tenant: <strong>${tenant.tenantName}</strong></p>
            </body>
          </html>
        `);

        console.log('\nAuthorization complete. You can now use xero-client.js.');
        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${err.message}</p>`);
        console.error('\nError during token exchange:', err.message);
        server.close();
        reject(err);
      }
    });

    server.listen(3000, () => {
      const state = randomBytes(16).toString('hex');
      const authUrl = `${XERO_AUTH_URL}?` + new URLSearchParams({
        response_type: 'code',
        client_id: XERO_CLIENT_ID,
        redirect_uri: XERO_REDIRECT_URI,
        scope: XERO_SCOPES,
        state,
      }).toString();

      console.log('Xero OAuth2 Authorization');
      console.log('=========================\n');
      console.log('Opening browser for Xero login...\n');
      console.log(`URL: ${authUrl}\n`);
      console.log('Waiting for callback on http://localhost:3000/callback ...\n');

      // Open browser on macOS
      exec(`open "${authUrl}"`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('Port 3000 is already in use. Stop whatever is running on port 3000 and try again.');
      }
      reject(err);
    });
  });
}

startServer().catch((err) => {
  console.error('Auth failed:', err.message);
  process.exit(1);
});
