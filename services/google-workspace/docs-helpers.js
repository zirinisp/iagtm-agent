/**
 * Google Docs Helpers
 *
 * Create, read, and update Google Docs documents via gws CLI.
 * Requires Docs API enabled on GCP project 519727030587.
 *
 * Usage:
 *   import { createDoc, getDoc } from './docs-helpers.js';
 *   const doc = await createDoc('Weekly Report');
 *   const content = await getDoc(doc.documentId);
 *
 * Registered in services/REGISTRY.md
 */

import { gws } from './gws-wrapper.js';

/**
 * Create a new Google Doc.
 * @param {string} title
 * @returns {Promise<{documentId: string, title: string, url: string}>}
 */
export async function createDoc(title) {
  const result = await gws('docs documents create', {
    json: { title },
  });
  return {
    documentId: result.documentId,
    title: result.title,
    url: `https://docs.google.com/document/d/${result.documentId}/edit`,
  };
}

/**
 * Get a Google Doc's content and metadata.
 * @param {string} documentId
 * @returns {Promise<object>} Full document object
 */
export async function getDoc(documentId) {
  return gws('docs documents get', {
    params: { documentId },
  });
}

/**
 * Update a Google Doc with batch update requests.
 * See: https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
 * @param {string} documentId
 * @param {object[]} requests - Array of update request objects
 * @returns {Promise<object>}
 */
export async function batchUpdateDoc(documentId, requests) {
  return gws('docs documents batchUpdate', {
    params: { documentId },
    json: { requests },
  });
}

/**
 * Insert text into a Google Doc at a given index.
 * @param {string} documentId
 * @param {string} text - Text to insert
 * @param {number} [index=1] - Insertion index (1 = start of doc)
 * @returns {Promise<object>}
 */
export async function insertText(documentId, text, index = 1) {
  return batchUpdateDoc(documentId, [
    {
      insertText: {
        location: { index },
        text,
      },
    },
  ]);
}

/**
 * Create a Google Doc with initial text content.
 * @param {string} title
 * @param {string} content - Initial text content
 * @returns {Promise<{documentId: string, title: string, url: string}>}
 */
export async function createDocWithContent(title, content) {
  const doc = await createDoc(title);
  if (content) {
    await insertText(doc.documentId, content);
  }
  return doc;
}

// --- CLI ---

if (process.argv[1]?.endsWith('docs-helpers.js')) {
  const [,, action, ...rest] = process.argv;

  if (action === 'create') {
    const title = rest[0] || 'IAGTM Test Doc';
    const content = rest[1] || '';
    const result = content
      ? await createDocWithContent(title, content)
      : await createDoc(title);
    console.log(`Created: ${result.url}`);
    console.log(JSON.stringify(result, null, 2));
  } else if (action === 'get') {
    const id = rest[0];
    if (!id) { console.log('Usage: node docs-helpers.js get <documentId>'); process.exit(1); }
    const doc = await getDoc(id);
    console.log(JSON.stringify(doc, null, 2));
  } else {
    console.log('Usage: node docs-helpers.js <create|get> [args...]');
  }
}
