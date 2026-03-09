/**
 * Google Drive API Client
 *
 * Provides folder lookup and link generation for the IAGTM Shared Drive.
 * Auto-refreshes tokens when expired.
 *
 * Usage:
 *   import { getTaskFolderLink, findFolderByName } from './gdrive-client.js';
 *   const link = await getTaskFolderLink('2026-03-09-1500-weekly-pnl');
 *
 * CLI:
 *   node services/google-drive/gdrive-client.js <folder-name>
 *   node services/google-drive/gdrive-client.js 2026-03-09-1500-weekly-pnl
 *
 * Registered in services/REGISTRY.md
 */

import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

const TOKEN_FILE = join(__dirname, 'tokens.json');
const TASKS_PARENT_ID = '1FQbnbi7wB0XkOneNwtqeCCf6C4uiKKZr';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;

// --- Token management ---

async function loadTokens() {
  const data = await readFile(TOKEN_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveTokens(tokens) {
  await writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

async function refreshAccessToken(tokens) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const newTokens = await response.json();
  const updated = {
    ...tokens,
    access_token: newTokens.access_token,
    expires_in: newTokens.expires_in,
    obtained_at: Date.now(),
  };
  await saveTokens(updated);
  return updated;
}

async function getAccessToken() {
  let tokens = await loadTokens();
  const expiresAt = (tokens.obtained_at || 0) + (tokens.expires_in || 3600) * 1000;
  if (Date.now() > expiresAt - 60000) {
    tokens = await refreshAccessToken(tokens);
  }
  return tokens.access_token;
}

// --- Drive API ---

async function driveRequest(path, params = {}) {
  const accessToken = await getAccessToken();
  const url = new URL(`https://www.googleapis.com/drive/v3${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive API error (${response.status}): ${err}`);
  }

  return response.json();
}

/**
 * Find a folder by name within a parent folder.
 * @param {string} folderName - Name of the folder to find
 * @param {string} parentId - Parent folder ID (defaults to tasks folder)
 * @returns {object|null} - { id, name, webViewLink } or null
 */
export async function findFolderByName(folderName, parentId = TASKS_PARENT_ID) {
  const q = `name = '${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const result = await driveRequest('/files', {
    q,
    fields: 'files(id,name,webViewLink)',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    corpora: 'allDrives',
  });

  return result.files && result.files.length > 0 ? result.files[0] : null;
}

/**
 * Get a shareable Google Drive link for a task folder.
 * @param {string} taskFolderName - e.g. '2026-03-09-1500-weekly-pnl'
 * @returns {string} - Google Drive URL
 */
export async function getTaskFolderLink(taskFolderName) {
  const folder = await findFolderByName(taskFolderName);
  if (!folder) {
    return `Folder "${taskFolderName}" not found in Drive. It may still be syncing — try again in a minute.\nParent folder: https://drive.google.com/drive/folders/${TASKS_PARENT_ID}`;
  }
  return folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;
}

/**
 * List all task folders in the Shared Drive.
 * @returns {Array<{id, name, webViewLink}>}
 */
export async function listTaskFolders() {
  const q = `'${TASKS_PARENT_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const result = await driveRequest('/files', {
    q,
    fields: 'files(id,name,webViewLink)',
    orderBy: 'name desc',
    pageSize: '50',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    corpora: 'allDrives',
  });

  return result.files || [];
}

// --- CLI ---

const isMain = process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/^.*(?=services)/, ''));

if (isMain || process.argv[1]?.endsWith('gdrive-client.js')) {
  const folderName = process.argv[2];

  if (!folderName) {
    console.log('Usage: node services/google-drive/gdrive-client.js <folder-name>');
    console.log('\nListing recent task folders...\n');
    try {
      const folders = await listTaskFolders();
      if (folders.length === 0) {
        console.log('No task folders found.');
      } else {
        for (const f of folders) {
          console.log(`  ${f.name}  →  ${f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`}`);
        }
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  } else {
    try {
      const link = await getTaskFolderLink(folderName);
      console.log(link);
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}
