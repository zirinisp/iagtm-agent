/**
 * Google Workspace CLI (gws) Wrapper
 *
 * Executes gws commands via child_process, parses JSON output,
 * handles errors and retries on rate limits.
 *
 * Usage:
 *   import { gws } from './gws-wrapper.js';
 *   const result = await gws('drive files list', { params: { pageSize: 5 } });
 *
 * Registered in services/REGISTRY.md
 */

import { execFile } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GWS_BIN = join(__dirname, 'node_modules', '.bin', 'gws');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Execute a gws CLI command and return parsed JSON.
 *
 * @param {string} command - gws command, e.g. 'drive files list' or 'sheets spreadsheets get'
 * @param {object} options
 * @param {object} [options.params] - URL/query parameters (passed as --params JSON)
 * @param {object} [options.json] - Request body (passed as --json JSON)
 * @param {string} [options.upload] - Local file path for upload (passed as --upload)
 * @param {string} [options.output] - Output file path for binary responses
 * @param {string} [options.format] - Output format: json (default), table, yaml, csv
 * @param {boolean} [options.pageAll] - Auto-paginate through all results
 * @param {number} [options.pageLimit] - Max pages to fetch with pageAll
 * @param {number} [options.timeout] - Timeout in ms (default: 30000)
 * @returns {Promise<object>} Parsed JSON response
 */
export async function gws(command, options = {}) {
  const args = command.split(/\s+/);

  if (options.params) {
    args.push('--params', JSON.stringify(options.params));
  }
  if (options.json) {
    args.push('--json', JSON.stringify(options.json));
  }
  if (options.upload) {
    args.push('--upload', options.upload);
  }
  if (options.output) {
    args.push('--output', options.output);
  }
  if (options.pageAll) {
    args.push('--page-all');
    if (options.pageLimit) {
      args.push('--page-limit', String(options.pageLimit));
    }
  }

  const format = options.format || 'json';
  args.push('--format', format);

  const timeout = options.timeout || 30000;

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await execGws(args, timeout);
      if (format === 'json') {
        return JSON.parse(result);
      }
      return result;
    } catch (err) {
      lastError = err;

      // Parse error JSON if possible
      let errorObj;
      try {
        errorObj = JSON.parse(err.message || err.stderr || '');
      } catch { /* not JSON */ }

      const code = errorObj?.error?.code;

      // Don't retry auth errors or validation errors
      if (code === 401 || code === 403) {
        const reason = errorObj?.error?.reason || '';
        if (reason === 'accessNotConfigured') {
          const enableUrl = errorObj?.error?.enable_url || '';
          throw new GwsError(
            `API not enabled. Enable at: ${enableUrl}`,
            code, reason, errorObj
          );
        }
        throw new GwsError(
          errorObj?.error?.message || 'Auth error',
          code, reason, errorObj
        );
      }

      // Retry on rate limits (429) or server errors (5xx)
      if (code === 429 || (code >= 500 && code < 600)) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
          continue;
        }
      }

      // Non-retryable error
      throw new GwsError(
        errorObj?.error?.message || err.message || 'gws command failed',
        code, errorObj?.error?.reason, errorObj
      );
    }
  }

  throw lastError;
}

/**
 * Check if gws is installed and authenticated.
 * @returns {Promise<object>} Auth status
 */
export async function gwsStatus() {
  const result = await execGws(['auth', 'status'], 10000);
  return JSON.parse(result);
}

/**
 * Get gws version.
 * @returns {Promise<string>}
 */
export async function gwsVersion() {
  const result = await execGws(['--version'], 5000);
  return result.split('\n')[0].trim();
}

// --- Internal helpers ---

function execGws(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const proc = execFile(GWS_BIN, args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      if (error) {
        // Attach stderr to error for parsing
        error.stderr = stderr;
        error.message = stderr || stdout || error.message;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class GwsError extends Error {
  constructor(message, code, reason, raw) {
    super(message);
    this.name = 'GwsError';
    this.code = code;
    this.reason = reason;
    this.raw = raw;
  }
}

export { GwsError };

// --- CLI: test connectivity ---

if (process.argv[1]?.endsWith('gws-wrapper.js')) {
  try {
    const version = await gwsVersion();
    console.log(`gws version: ${version}`);
    const status = await gwsStatus();
    console.log('Auth status:', JSON.stringify(status, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
