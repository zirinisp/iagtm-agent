/**
 * IAGTM Deliverables — Google Docs & Sheets Output Service
 *
 * Central module for creating human-facing deliverables as Google Docs or Sheets
 * instead of .md files. Markdown renders natively in Google Docs; Sheets support
 * formatted financial tables with proper number formats and frozen headers.
 *
 * Usage:
 *   import { createGoogleDoc, createGoogleSheet, getDocText, getDocComments, resolveComment } from './deliverables.js';
 *
 *   // Create a Google Doc from markdown
 *   const doc = await createGoogleDoc('Email to Josh', markdownContent, folderId);
 *   console.log(doc.url); // → shareable Google Doc URL
 *
 *   // Create a formatted Google Sheet
 *   const sheet = await createGoogleSheet('March P&L', headers, rows, { currencyCols: [1, 2, 3] });
 *
 *   // Read a doc (for agent to understand its content)
 *   const text = await getDocText(doc.documentId);
 *
 *   // Review and resolve user comments
 *   const comments = await getDocComments(doc.documentId);
 *   await resolveComment(doc.documentId, comments[0].id, 'Updated — see revised paragraph.');
 *
 *   // Update a doc in-place (same URL, new content, version history preserved)
 *   await updateGoogleDoc(doc.documentId, updatedMarkdown);
 *
 * Auth: Uses paz.n8n@gmail.com OAuth2 credentials from services/google-drive/.env + tokens.json.
 * Default folderId: IAGTM AI Shared Drive root (1FQbnbi7wB0XkOneNwtqeCCf6C4uiKKZr).
 *
 * Registered in services/REGISTRY.md
 */

import { gws } from './gws-wrapper.js';
import { execFile } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GWS_BIN = join(__dirname, 'node_modules', '.bin', 'gws');

// IAGTM AI Shared Drive root folder (tasks parent)
const DEFAULT_FOLDER_ID = '1FQbnbi7wB0XkOneNwtqeCCf6C4uiKKZr';

// Cache the gws access token within a session (expires in 3600s)
let _gwsTokenCache = null;
let _gwsTokenExpiresAt = 0;

/**
 * Get an OAuth2 access token from gws credentials.
 * gws has full Drive write scope; uses refresh_token from gws auth export.
 */
async function getGwsAccessToken() {
  if (_gwsTokenCache && Date.now() < _gwsTokenExpiresAt - 60000) {
    return _gwsTokenCache;
  }

  // Export gws credentials (refresh_token + client_id/secret)
  const credsJson = await new Promise((resolve, reject) => {
    execFile(GWS_BIN, ['auth', 'export', '--unmasked', '--format', 'json'], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve(stdout.trim());
    });
  });

  const creds = JSON.parse(credsJson);

  // Exchange refresh token for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const token = await response.json();
  _gwsTokenCache = token.access_token;
  _gwsTokenExpiresAt = Date.now() + (token.expires_in || 3600) * 1000;
  return _gwsTokenCache;
}

// IAGTM brand colours for Sheets formatting
const NAVY_RGB = { red: 0.106, green: 0.227, blue: 0.361 }; // #1B3A5C
const WHITE_RGB = { red: 1, green: 1, blue: 1 };

// ---------------------------------------------------------------------------
// Internal: Drive API multipart upload (markdown → Google Doc conversion)
// ---------------------------------------------------------------------------

/**
 * Perform a Drive API multipart upload to create or update a Google Doc.
 * The Drive API converts text/markdown → application/vnd.google-apps.document natively.
 *
 * @param {string} method - 'POST' (create) or 'PATCH' (update)
 * @param {string} endpoint - Drive API path (e.g. '/files' or '/files/FILE_ID')
 * @param {object} metadata - File metadata (name, mimeType, parents, etc.)
 * @param {string} markdownContent - Markdown string to upload
 * @param {object} queryParams - URL query parameters
 * @returns {Promise<object>} Drive API response (id, name, webViewLink)
 */
async function driveMultipartUpload(method, endpoint, metadata, markdownContent, queryParams = {}) {
  const accessToken = await getGwsAccessToken();

  const boundary = `iagtm-boundary-${Date.now()}`;
  const metadataJson = JSON.stringify(metadata);
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadataJson,
    `--${boundary}`,
    'Content-Type: text/markdown',
    '',
    markdownContent,
    `--${boundary}--`,
  ].join('\r\n');

  const url = new URL(`https://www.googleapis.com/upload/drive/v3${endpoint}`);
  url.searchParams.set('uploadType', 'multipart');
  url.searchParams.set('fields', 'id,name,webViewLink');
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(Buffer.byteLength(body, 'utf8')),
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive API error (${response.status}): ${err}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Google Docs
// ---------------------------------------------------------------------------

/**
 * Create a Google Doc from markdown content.
 *
 * Uses the Drive API multipart upload to convert text/markdown →
 * application/vnd.google-apps.document in a single API call.
 * Google renders headings, bold, italic, tables, lists, and code blocks natively —
 * identical to what Google Docs' own "Import" menu produces.
 *
 * @param {string} title - Document title
 * @param {string} markdownContent - Markdown string to convert
 * @param {string} [folderId] - Drive folder ID (defaults to IAGTM AI Shared Drive root)
 * @returns {Promise<{documentId: string, url: string, title: string}>}
 */
export async function createGoogleDoc(title, markdownContent, folderId = DEFAULT_FOLDER_ID) {
  const metadata = {
    name: title,
    mimeType: 'application/vnd.google-apps.document',
    parents: [folderId],
  };

  const result = await driveMultipartUpload(
    'POST',
    '/files',
    metadata,
    markdownContent,
    { supportsAllDrives: true },
  );

  return {
    documentId: result.id,
    url: result.webViewLink,
    title: result.name,
  };
}

/**
 * Update an existing Google Doc in-place.
 *
 * Re-uploads markdown to the same file ID. The URL stays the same,
 * Google Drive version history is preserved, and any existing shares/permissions
 * are unchanged.
 *
 * @param {string} fileId - The Google Doc file ID (documentId)
 * @param {string} markdownContent - New markdown content
 * @returns {Promise<{documentId: string, url: string}>}
 */
export async function updateGoogleDoc(fileId, markdownContent) {
  const result = await driveMultipartUpload(
    'PATCH',
    `/files/${fileId}`,
    {},
    markdownContent,
    { supportsAllDrives: true },
  );

  return {
    documentId: result.id,
    url: result.webViewLink,
  };
}

/**
 * Extract plain text from a Google Doc.
 *
 * Traverses the Docs API body.content structure to produce readable text.
 * Use this to read a Google Doc back for agent understanding or to produce
 * an updated version for re-uploading.
 *
 * @param {string} docId - Google Doc document ID
 * @returns {Promise<string>} Plain text content
 */
export async function getDocText(docId) {
  const doc = await gws('docs documents get', {
    params: { documentId: docId },
  });

  const lines = [];

  for (const element of (doc.body?.content || [])) {
    if (element.paragraph) {
      const lineText = (element.paragraph.elements || [])
        .map(el => el.textRun?.content || '')
        .join('');
      lines.push(lineText);
    } else if (element.table) {
      for (const row of (element.table.tableRows || [])) {
        const cells = (row.tableCells || []).map(cell => {
          return (cell.content || [])
            .flatMap(ce => (ce.paragraph?.elements || []))
            .map(el => el.textRun?.content || '')
            .join('')
            .trim();
        });
        lines.push(cells.join('\t'));
      }
    }
  }

  return lines.join('').trimEnd();
}

/**
 * List unresolved comments on a Google Doc.
 *
 * @param {string} docId - Google Doc file ID (same as documentId)
 * @returns {Promise<Array<{id: string, content: string, author: string, quotedContent: string}>>}
 */
export async function getDocComments(docId) {
  const result = await gws('drive comments list', {
    params: {
      fileId: docId,
      fields: 'comments(id,content,resolved,author/displayName,quotedFileContent/value)',
      includeDeleted: false,
    },
  });

  return (result.comments || [])
    .filter(c => !c.resolved)
    .map(c => ({
      id: c.id,
      content: c.content,
      author: c.author?.displayName || 'Unknown',
      quotedContent: c.quotedFileContent?.value || '',
    }));
}

/**
 * Resolve a comment by replying with a note and marking it resolved.
 *
 * @param {string} docId - Google Doc file ID
 * @param {string} commentId - Comment ID from getDocComments()
 * @param {string} replyText - Message to attach with the resolution
 * @returns {Promise<{id: string, action: string}>}
 */
export async function resolveComment(docId, commentId, replyText) {
  const result = await gws('drive replies create', {
    params: {
      fileId: docId,
      commentId,
      fields: 'id,action',
    },
    json: {
      action: 'resolve',
      content: replyText,
    },
  });

  return { id: result.id, action: result.action };
}

// ---------------------------------------------------------------------------
// Google Sheets
// ---------------------------------------------------------------------------

/**
 * Create a formatted Google Sheet with data and IAGTM brand styling.
 *
 * Creates the spreadsheet, writes the data, then applies formatting in one
 * batchUpdate call: navy header row, frozen first row, £ currency on specified columns.
 *
 * @param {string} title - Spreadsheet title
 * @param {string[]} headers - Column header labels
 * @param {Array<Array<string|number>>} rows - Data rows (2D array)
 * @param {object} [formatOptions]
 * @param {number[]} [formatOptions.currencyCols] - 0-based column indices to format as £
 * @param {boolean} [formatOptions.boldHeaders=true] - Bold the header row
 * @param {string} [folderId] - Drive folder ID to move sheet into after creation
 * @returns {Promise<{spreadsheetId: string, url: string, title: string}>}
 */
export async function createGoogleSheet(title, headers, rows, formatOptions = {}, folderId) {
  const { currencyCols = [], boldHeaders = true } = formatOptions;

  // Step 1: Create the spreadsheet
  const created = await gws('sheets spreadsheets create', {
    json: {
      properties: { title },
      sheets: [{ properties: { title: 'Data' } }],
    },
  });

  const spreadsheetId = created.spreadsheetId;
  const sheetId = created.sheets?.[0]?.properties?.sheetId ?? 0;
  const url = created.spreadsheetUrl;

  // Step 2: Write data (headers + rows)
  const values = [headers, ...rows];
  await gws('sheets spreadsheets values update', {
    params: {
      spreadsheetId,
      range: 'Data!A1',
      valueInputOption: 'USER_ENTERED',
    },
    json: { values },
  });

  // Step 3: Format via batchUpdate
  const formatRequests = [];

  if (boldHeaders) {
    formatRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: headers.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: NAVY_RGB,
            textFormat: { bold: true, foregroundColor: WHITE_RGB },
            horizontalAlignment: 'LEFT',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    });
  }

  formatRequests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  for (const colIndex of currencyCols) {
    formatRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rows.length + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '"£"#,##0.00' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  }

  if (formatRequests.length > 0) {
    await gws('sheets spreadsheets batchUpdate', {
      params: { spreadsheetId },
      json: { requests: formatRequests },
    });
  }

  // Step 4: Move to target folder if specified
  if (folderId) {
    await gws('drive files update', {
      params: {
        fileId: spreadsheetId,
        addParents: folderId,
        supportsAllDrives: true,
        fields: 'id',
      },
      json: {},
    });
  }

  return { spreadsheetId, url, title };
}

// ---------------------------------------------------------------------------
// CLI — for testing individual functions
// ---------------------------------------------------------------------------

if (process.argv[1]?.endsWith('deliverables.js')) {
  const [,, action, ...rest] = process.argv;

  if (action === 'create-doc') {
    const [docTitle, ...contentParts] = rest;
    const content = contentParts.join(' ') || '# Test\n\nThis is a **test** document from the IAGTM agent.';
    const doc = await createGoogleDoc(docTitle || 'IAGTM Test Doc', content);
    console.log(`Created: ${doc.url}`);
    console.log(JSON.stringify(doc, null, 2));

  } else if (action === 'update-doc') {
    const [fileId, ...contentParts] = rest;
    if (!fileId) { console.log('Usage: node deliverables.js update-doc <fileId> [content]'); process.exit(1); }
    const content = contentParts.join(' ') || '# Updated\n\nThis document was updated by the IAGTM agent.';
    const result = await updateGoogleDoc(fileId, content);
    console.log(`Updated: ${result.url}`);

  } else if (action === 'get-text') {
    const [docId] = rest;
    if (!docId) { console.log('Usage: node deliverables.js get-text <docId>'); process.exit(1); }
    const text = await getDocText(docId);
    console.log(text);

  } else if (action === 'get-comments') {
    const [docId] = rest;
    if (!docId) { console.log('Usage: node deliverables.js get-comments <docId>'); process.exit(1); }
    const comments = await getDocComments(docId);
    console.log(`${comments.length} unresolved comment(s):`);
    console.log(JSON.stringify(comments, null, 2));

  } else if (action === 'resolve-comment') {
    const [docId, commentId, ...replyParts] = rest;
    if (!docId || !commentId) { console.log('Usage: node deliverables.js resolve-comment <docId> <commentId> [reply]'); process.exit(1); }
    const reply = replyParts.join(' ') || 'Addressed.';
    const result = await resolveComment(docId, commentId, reply);
    console.log('Resolved:', JSON.stringify(result, null, 2));

  } else if (action === 'create-sheet') {
    const sheetTitle = rest[0] || 'IAGTM Test Sheet';
    const headers = ['Location', 'Revenue', 'Food Cost', 'Labour'];
    const rows = [
      ['Paddington', 45000, 12500, 9800],
      ['Shoreditch', 38000, 10500, 8200],
      ['Brent Cross', 31000, 8600, 6700],
      ['Wandsworth', 28000, 7700, 6100],
      ['Peckham', 22000, 6100, 4800],
      ['Chiswick', 18000, 5000, 3900],
    ];
    const sheet = await createGoogleSheet(sheetTitle, headers, rows, { currencyCols: [1, 2, 3] });
    console.log(`Created: ${sheet.url}`);
    console.log(JSON.stringify(sheet, null, 2));

  } else {
    console.log(`Usage: node deliverables.js <action> [args]

Actions:
  create-doc <title> [content]           Create a Google Doc from markdown
  update-doc <fileId> [content]          Update an existing Google Doc in-place
  get-text <docId>                       Extract plain text from a Google Doc
  get-comments <docId>                   List unresolved comments on a Google Doc
  resolve-comment <docId> <commentId>    Resolve a comment with an optional reply text
  create-sheet <title>                   Create a formatted test Google Sheet
`);
  }
}
