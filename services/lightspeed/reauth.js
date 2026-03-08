/**
 * Automated Lightspeed OAuth re-authorization via CDP browser.
 *
 * Starts the auth server on port 3000, opens a tab in the CDP Chrome
 * (which already has an active Lightspeed session), waits for the
 * callback to save a new token, then cleans up.
 *
 * Usage:  node reauth.js
 * Or:     import { reauthorize } from './reauth.js';
 *         await reauthorize();
 *
 * Prerequisites:
 *   - CDP Chrome running on port 9222 (bash setup/chrome-cdp.sh start)
 *   - Active Lightspeed session in CDP Chrome (login at pos-admin.lsk.lightspeed.app)
 */
import 'dotenv/config';
import { spawn } from 'child_process';
import { readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dirname, 'tokens.json');
const AUTH_SERVER = join(__dirname, 'auth-server.js');
const CDP_PORT = 9222;
const AUTH_PORT = 3000;

async function getTokenMtime() {
  try {
    const s = await stat(TOKEN_FILE);
    return s.mtimeMs;
  } catch {
    return 0;
  }
}

async function waitForPort(port, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      // Auth server redirects (302) on GET / — that counts as up
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error(`Port ${port} did not become available within ${timeoutMs}ms`);
}

async function openCdpTab(url) {
  // Use CDP HTTP API to open a new tab
  const res = await fetch(`http://localhost:${CDP_PORT}/json/new?${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`CDP new tab failed: ${res.status}`);
  return res.json(); // returns { id, url, ... }
}

async function closeCdpTab(tabId) {
  try {
    await fetch(`http://localhost:${CDP_PORT}/json/close/${tabId}`);
  } catch {
    // tab may already be closed
  }
}

export async function reauthorize({ timeoutMs = 30000 } = {}) {
  console.log('[reauth] Starting automated re-authorization...');

  // Record token file mtime before we start
  const mtimeBefore = await getTokenMtime();

  // Check if auth server is already running
  let authServerProcess = null;
  let serverAlreadyRunning = false;
  try {
    await fetch(`http://localhost:${AUTH_PORT}/health`);
    serverAlreadyRunning = true;
  } catch {
    // Not running — start it
    console.log('[reauth] Starting auth server on port', AUTH_PORT);
    authServerProcess = spawn(process.execPath, [AUTH_SERVER], {
      cwd: __dirname,
      stdio: 'pipe',
      env: { ...process.env },
    });
    authServerProcess.stderr.on('data', d => {
      const msg = d.toString().trim();
      if (msg) console.error('[auth-server]', msg);
    });
    await waitForPort(AUTH_PORT);
    console.log('[reauth] Auth server ready');
  }

  try {
    // Check CDP Chrome is running
    let cdpAvailable = false;
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json/version`);
      cdpAvailable = res.ok;
    } catch {}

    if (!cdpAvailable) {
      throw new Error(
        'CDP Chrome is not running on port 9222. Start it with: bash setup/chrome-cdp.sh start'
      );
    }

    // Open auth URL in a new CDP tab
    console.log('[reauth] Opening auth flow in CDP browser...');
    const tab = await openCdpTab(`http://localhost:${AUTH_PORT}`);
    console.log('[reauth] Opened tab:', tab.id);

    // Wait for token file to be updated (callback saves new token)
    const start = Date.now();
    let tokenUpdated = false;
    while (Date.now() - start < timeoutMs) {
      const mtimeNow = await getTokenMtime();
      if (mtimeNow > mtimeBefore) {
        tokenUpdated = true;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    // Clean up the CDP tab
    await closeCdpTab(tab.id);

    if (!tokenUpdated) {
      throw new Error(
        `Re-authorization timed out after ${timeoutMs / 1000}s. ` +
        'Lightspeed session may have expired — log in at pos-admin.lsk.lightspeed.app in CDP Chrome, ' +
        'then run reauth again.'
      );
    }

    const tokens = JSON.parse(await readFile(TOKEN_FILE, 'utf-8'));
    console.log('[reauth] New token obtained:', tokens.access_token.substring(0, 8) + '...');
    console.log('[reauth] Expires:', tokens.expires_at);
    return tokens;
  } finally {
    // Kill auth server if we started it
    if (authServerProcess) {
      authServerProcess.kill('SIGTERM');
      console.log('[reauth] Auth server stopped');
    }
  }
}

// Run directly: node reauth.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  reauthorize()
    .then(t => {
      console.log('[reauth] Done. Token:', t.access_token);
      process.exit(0);
    })
    .catch(err => {
      console.error('[reauth] Failed:', err.message);
      process.exit(1);
    });
}
