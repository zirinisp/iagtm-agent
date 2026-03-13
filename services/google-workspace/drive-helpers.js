/**
 * Google Drive Helpers (via gws CLI)
 *
 * Upload files, create folders, and list files in Google Drive.
 * Complements the existing services/google-drive/gdrive-client.js (read-only, task folders).
 *
 * NOTE: Do NOT use these for task folders — those sync via Google Drive desktop app.
 * Use these for non-task locations (shared report folders, team-facing directories).
 *
 * Usage:
 *   import { uploadFile, createFolder, listFiles } from './drive-helpers.js';
 *   const file = await uploadFile('/path/to/report.pdf', 'FOLDER_ID');
 *
 * Registered in services/REGISTRY.md
 */

import { gws } from './gws-wrapper.js';
import { basename } from 'path';

/**
 * Upload a file to Google Drive.
 * @param {string} localPath - Local file path to upload
 * @param {string} [folderId] - Parent folder ID (optional)
 * @param {string} [name] - File name in Drive (defaults to local filename)
 * @returns {Promise<{id: string, name: string, url: string}>}
 */
export async function uploadFile(localPath, folderId, name) {
  const fileName = name || basename(localPath);
  const metadata = { name: fileName };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const result = await gws('drive files create', {
    json: metadata,
    upload: localPath,
    params: {
      supportsAllDrives: true,
      fields: 'id,name,webViewLink,mimeType',
    },
  });

  return {
    id: result.id,
    name: result.name,
    url: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    mimeType: result.mimeType,
  };
}

/**
 * Create a folder in Google Drive.
 * @param {string} name - Folder name
 * @param {string} [parentId] - Parent folder ID (optional)
 * @returns {Promise<{id: string, name: string, url: string}>}
 */
export async function createFolder(name, parentId) {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const result = await gws('drive files create', {
    json: metadata,
    params: {
      supportsAllDrives: true,
      fields: 'id,name,webViewLink',
    },
  });

  return {
    id: result.id,
    name: result.name,
    url: result.webViewLink || `https://drive.google.com/drive/folders/${result.id}`,
  };
}

/**
 * List files in a Drive folder.
 * @param {string} folderId - Folder ID to list
 * @param {object} [options]
 * @param {string} [options.query] - Additional query filter
 * @param {number} [options.pageSize] - Max results (default 20)
 * @returns {Promise<Array<{id, name, mimeType, url}>>}
 */
export async function listFiles(folderId, options = {}) {
  const q = options.query
    ? `'${folderId}' in parents and trashed = false and ${options.query}`
    : `'${folderId}' in parents and trashed = false`;

  const result = await gws('drive files list', {
    params: {
      q,
      pageSize: options.pageSize || 20,
      fields: 'files(id,name,mimeType,webViewLink)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: 'allDrives',
    },
  });

  return (result.files || []).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
  }));
}

// --- CLI ---

if (process.argv[1]?.endsWith('drive-helpers.js')) {
  const [,, action, ...rest] = process.argv;

  if (action === 'upload') {
    const [filePath, folderId] = rest;
    if (!filePath) { console.log('Usage: node drive-helpers.js upload <file> [folderId]'); process.exit(1); }
    const result = await uploadFile(filePath, folderId);
    console.log(`Uploaded: ${result.url}`);
    console.log(JSON.stringify(result, null, 2));
  } else if (action === 'list') {
    const folderId = rest[0];
    if (!folderId) { console.log('Usage: node drive-helpers.js list <folderId>'); process.exit(1); }
    const files = await listFiles(folderId);
    for (const f of files) {
      console.log(`  ${f.name}  (${f.mimeType})  →  ${f.url}`);
    }
  } else if (action === 'mkdir') {
    const [name, parentId] = rest;
    if (!name) { console.log('Usage: node drive-helpers.js mkdir <name> [parentId]'); process.exit(1); }
    const result = await createFolder(name, parentId);
    console.log(`Created folder: ${result.url}`);
  } else {
    console.log('Usage: node drive-helpers.js <upload|list|mkdir> [args...]');
  }
}
