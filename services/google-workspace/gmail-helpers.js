/**
 * Gmail Helpers
 *
 * Search, read, and extract data from Gmail messages via gws CLI.
 * Requires Gmail API enabled on GCP project 519727030587.
 *
 * Key use case: reading OTP codes for automated login flows
 * (replaces Playwright browser-based Gmail reading).
 *
 * Usage:
 *   import { searchMessages, readMessage, getLatestOTP } from './gmail-helpers.js';
 *   const otp = await getLatestOTP();
 *
 * Registered in services/REGISTRY.md
 */

import { gws } from './gws-wrapper.js';

/**
 * Search Gmail messages.
 * @param {string} query - Gmail search query (same as web UI)
 * @param {number} [maxResults=5] - Max messages to return
 * @returns {Promise<Array<{id, threadId}>>}
 */
export async function searchMessages(query, maxResults = 5) {
  const result = await gws('gmail users messages list', {
    params: { userId: 'me', q: query, maxResults },
  });
  return result.messages || [];
}

/**
 * Read a full Gmail message by ID.
 * @param {string} messageId
 * @param {string} [format='full'] - 'full', 'metadata', 'minimal', 'raw'
 * @returns {Promise<object>} Full message object with headers, body, etc.
 */
export async function readMessage(messageId, format = 'full') {
  return gws('gmail users messages get', {
    params: { userId: 'me', id: messageId, format },
  });
}

/**
 * Get headers from a message (Subject, From, Date, etc).
 * @param {object} message - Full message object from readMessage
 * @returns {object} Key-value header map
 */
export function extractHeaders(message) {
  const headers = {};
  for (const h of message.payload?.headers || []) {
    headers[h.name.toLowerCase()] = h.value;
  }
  return headers;
}

/**
 * Get plain text body from a message.
 * @param {object} message - Full message object
 * @returns {string} Decoded plain text body
 */
export function extractBody(message) {
  const payload = message.payload;
  if (!payload) return '';

  // Simple message with body directly
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  // Multipart message — find text/plain
  const parts = payload.parts || [];
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
  }

  // Try text/html as fallback
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
  }

  return '';
}

/**
 * Get the latest OTP/verification code from Gmail.
 * Searches for recent verification emails and extracts the numeric code.
 * @param {object} [options]
 * @param {string} [options.query] - Custom search query (default: recent verification emails)
 * @param {number} [options.maxAge] - Max age in minutes (default: 10)
 * @returns {Promise<string|null>} The OTP code or null if not found
 */
export async function getLatestOTP(options = {}) {
  const maxAge = options.maxAge || 10;
  const query = options.query || `(subject:verification OR subject:code OR subject:OTP OR subject:"sign in") newer_than:${maxAge}m`;

  const messages = await searchMessages(query, 3);
  if (messages.length === 0) return null;

  const message = await readMessage(messages[0].id);
  const body = extractBody(message);
  const subject = extractHeaders(message).subject || '';

  // Try to extract 4-6 digit code from body or subject
  const codeMatch = (body + ' ' + subject).match(/\b(\d{4,6})\b/);
  return codeMatch ? codeMatch[1] : null;
}

// --- CLI ---

if (process.argv[1]?.endsWith('gmail-helpers.js')) {
  const [,, action, ...rest] = process.argv;

  if (action === 'search') {
    const query = rest.join(' ') || 'is:unread';
    const messages = await searchMessages(query);
    console.log(`Found ${messages.length} messages`);
    for (const m of messages) {
      const full = await readMessage(m.id, 'metadata');
      const headers = extractHeaders(full);
      console.log(`  ${headers.date} | ${headers.from} | ${headers.subject}`);
    }
  } else if (action === 'otp') {
    const code = await getLatestOTP();
    if (code) {
      console.log(`OTP code: ${code}`);
    } else {
      console.log('No OTP code found in recent emails');
    }
  } else if (action === 'read') {
    const id = rest[0];
    if (!id) { console.log('Usage: node gmail-helpers.js read <messageId>'); process.exit(1); }
    const msg = await readMessage(id);
    const headers = extractHeaders(msg);
    console.log(`From: ${headers.from}`);
    console.log(`Subject: ${headers.subject}`);
    console.log(`Date: ${headers.date}`);
    console.log('---');
    console.log(extractBody(msg));
  } else {
    console.log('Usage: node gmail-helpers.js <search|otp|read> [args...]');
  }
}
