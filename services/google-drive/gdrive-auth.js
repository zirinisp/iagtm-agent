/**
 * Google Drive OAuth2 Authorization — One-time setup
 *
 * Run this once to authorize the app and obtain access + refresh tokens.
 * Tokens are saved to tokens.json for use by gdrive-client.js.
 *
 * Prerequisites:
 *   1. Create a Google Cloud project at https://console.cloud.google.com
 *   2. Enable the Google Drive API
 *   3. Create OAuth2 credentials (Desktop app type)
 *   4. Download credentials and set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env
 *
 * Usage: node services/google-drive/gdrive-auth.js
 */

import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;

const REDIRECT_URI = 'http://localhost:3001/callback';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const TOKEN_FILE = join(__dirname, 'tokens.json');

async function exchangeCodeForTokens(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return response.json();
}

async function main() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    console.error('See header comment for setup instructions.');
    process.exit(1);
  }

  const state = randomBytes(16).toString('hex');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  console.log('\nOpening browser for Google authorization...\n');
  exec(`open "${authUrl.toString()}"`);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:3001`);

    if (url.pathname !== '/callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const returnedState = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400);
      res.end(`Authorization error: ${error}`);
      server.close();
      process.exit(1);
    }

    if (returnedState !== state) {
      res.writeHead(400);
      res.end('State mismatch');
      server.close();
      process.exit(1);
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      tokens.obtained_at = Date.now();

      await writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
      console.log(`\nTokens saved to ${TOKEN_FILE}`);
      console.log('Google Drive API ready.\n');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Google Drive authorized!</h2><p>You can close this tab.</p></body></html>');
    } catch (err) {
      console.error('Token exchange error:', err.message);
      res.writeHead(500);
      res.end('Token exchange failed');
    }

    server.close();
    process.exit(0);
  });

  server.listen(3001, () => {
    console.log('Waiting for OAuth callback on http://localhost:3001/callback ...');
  });
}

main();
