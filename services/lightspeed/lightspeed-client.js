import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dirname, 'tokens.json');

const {
  LIGHTSPEED_CLIENT_ID,
  LIGHTSPEED_CLIENT_SECRET,
  LIGHTSPEED_TOKEN_URL,
  LIGHTSPEED_API_BASE,
} = process.env;

export async function loadTokens() {
  const data = await readFile(TOKEN_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveTokens(tokens) {
  const data = {
    ...tokens,
    obtained_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
  await writeFile(TOKEN_FILE, JSON.stringify(data, null, 2));
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const credentials = Buffer.from(`${LIGHTSPEED_CLIENT_ID}:${LIGHTSPEED_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(LIGHTSPEED_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Refresh failed (${response.status}): ${body}`);
  }

  const tokens = await response.json();
  await saveTokens(tokens);
  return tokens;
}

export async function getAccessToken() {
  const tokens = await loadTokens();
  const expiresAt = new Date(tokens.expires_at);
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry

  if (Date.now() > expiresAt.getTime() - bufferMs) {
    console.log('Access token expired or expiring soon, refreshing...');
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    return newTokens.access_token;
  }

  return tokens.access_token;
}

export async function apiRequest(path, options = {}) {
  const token = await getAccessToken();
  const url = `${LIGHTSPEED_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status} ${path}: ${body}`);
  }

  return response.json();
}
