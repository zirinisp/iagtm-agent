import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile } from 'fs/promises';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: `${__dirname}/.env` });

const TOKEN_FILE = join(__dirname, 'tokens.json');

const {
  XERO_CLIENT_ID,
  XERO_CLIENT_SECRET,
  XERO_TOKEN_URL,
  XERO_API_BASE,
} = process.env;

/**
 * Load tokens from tokens.json.
 * Throws if file doesn't exist (user needs to run xero-auth.js first).
 */
export async function loadTokens() {
  try {
    const data = await readFile(TOKEN_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        'tokens.json not found. Run "node services/xero/xero-auth.js" to authorize first.'
      );
    }
    throw err;
  }
}

/**
 * Save tokens to tokens.json with computed timestamps.
 */
async function saveTokens(tokens) {
  const data = {
    ...tokens,
    obtained_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
  await writeFile(TOKEN_FILE, JSON.stringify(data, null, 2));
  return data;
}

/**
 * Refresh the access token using the refresh token.
 * Xero uses rotating refresh tokens — each refresh returns a new refresh token.
 */
export async function refreshAccessToken(refreshToken) {
  const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(XERO_TOKEN_URL, {
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
    throw new Error(`Xero token refresh failed (${response.status}): ${body}`);
  }

  const newTokens = await response.json();

  // Preserve tenant_id and tenants from existing tokens
  const existing = await loadTokens();
  const merged = {
    ...newTokens,
    tenant_id: existing.tenant_id,
    tenants: existing.tenants,
  };

  await saveTokens(merged);
  console.log('Xero access token refreshed successfully.');
  return merged;
}

/**
 * Get a valid access token, refreshing if expired or expiring soon.
 */
export async function getAccessToken() {
  const tokens = await loadTokens();
  const expiresAt = new Date(tokens.expires_at);
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry

  if (Date.now() > expiresAt.getTime() - bufferMs) {
    console.log('Xero access token expired or expiring soon, refreshing...');
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    return newTokens.access_token;
  }

  return tokens.access_token;
}

/**
 * Resolve a tenant ID from a name shortcut or UUID.
 * Supports: 'grl' (Greek Restaurant Ltd), 'pagema' (Pagema Ltd), or a raw UUID.
 * Defaults to 'grl' if not specified.
 */
async function resolveTenantId(tenant) {
  const tokens = await loadTokens();
  if (!tenant) return tokens.tenant_id;
  if (tokens.tenants && tokens.tenants[tenant]) return tokens.tenants[tenant];
  return tenant; // assume raw UUID
}

/**
 * Make an authenticated API request to Xero.
 * Includes xero-tenant-id header (required for auth code flow).
 *
 * @param {string} path - API path (e.g., '/Organisation')
 * @param {object} options - fetch options + optional `tenant` ('grl' or 'pagema')
 *
 * Rate limits: 60 calls/min, 5000 calls/day.
 */
export async function apiRequest(path, options = {}) {
  const { tenant, ...fetchOptions } = options;
  const tenantId = await resolveTenantId(tenant);
  const token = await getAccessToken();
  const url = `${XERO_API_BASE}${path}`;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'xero-tenant-id': tenantId,
    ...fetchOptions.headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Log rate limit headers when present
  const remaining = response.headers.get('x-rate-limit-problem');
  const minuteRemaining = response.headers.get('x-minlimit-remaining');
  const dayRemaining = response.headers.get('x-daylimit-remaining');
  if (minuteRemaining || dayRemaining) {
    console.log(`Xero rate limits — minute: ${minuteRemaining}, day: ${dayRemaining}`);
  }
  if (remaining) {
    console.warn(`Xero rate limit problem: ${remaining}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Xero API ${response.status} ${path}: ${body}`);
  }

  return response.json();
}

// --- Helper functions for key endpoints ---

/**
 * Profit & Loss report.
 * Note: Report endpoints return nested Rows[].Cells[] structure — parsing is left to the skill layer.
 *
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @param {object} options - trackingCategoryID, trackingOptionID, periods, timeframe, etc.
 */
export function getProfitAndLoss(fromDate, toDate, options = {}) {
  const { tenant, ...queryOptions } = options;
  const params = new URLSearchParams({ fromDate, toDate, ...queryOptions });
  return apiRequest(`/Reports/ProfitAndLoss?${params}`, { tenant });
}

/**
 * Balance Sheet report.
 * Note: Report endpoints return nested Rows[].Cells[] structure.
 *
 * @param {string} date - YYYY-MM-DD
 * @param {object} options - periods, timeframe, trackingOptionID1, etc.
 */
export function getBalanceSheet(date, options = {}) {
  const { tenant, ...queryOptions } = options;
  const params = new URLSearchParams({ date, ...queryOptions });
  return apiRequest(`/Reports/BalanceSheet?${params}`, { tenant });
}

/**
 * Trial Balance report.
 * Note: Report endpoints return nested Rows[].Cells[] structure.
 *
 * @param {string} date - YYYY-MM-DD
 * @param {object} options - paymentsOnly, etc.
 */
export function getTrialBalance(date, options = {}) {
  const { tenant, ...queryOptions } = options;
  const params = new URLSearchParams({ date, ...queryOptions });
  return apiRequest(`/Reports/TrialBalance?${params}`, { tenant });
}

/**
 * Get invoices with optional filtering.
 * @param {object} params - where, order, page, modifiedAfter, IDs, tenant, etc.
 */
export function getInvoices(params = {}) {
  const { tenant, ...queryParams } = params;
  const qs = new URLSearchParams(queryParams);
  const query = qs.toString();
  return apiRequest(`/Invoices${query ? '?' + query : ''}`, { tenant });
}

/**
 * Get bank transactions with optional filtering and pagination.
 * @param {object} params - where, order, page, tenant, etc.
 */
export function getBankTransactions(params = {}) {
  const { tenant, ...queryParams } = params;
  const qs = new URLSearchParams(queryParams);
  const query = qs.toString();
  return apiRequest(`/BankTransactions${query ? '?' + query : ''}`, { tenant });
}

/**
 * Get contacts with optional filtering.
 * @param {object} params - where, order, page, IDs, tenant, etc.
 */
export function getContacts(params = {}) {
  const { tenant, ...queryParams } = params;
  const qs = new URLSearchParams(queryParams);
  const query = qs.toString();
  return apiRequest(`/Contacts${query ? '?' + query : ''}`, { tenant });
}

/**
 * Get chart of accounts.
 * @param {string} tenant - 'grl' or 'pagema' (default: grl)
 */
export function getAccounts(tenant) {
  return apiRequest('/Accounts', { tenant });
}

/**
 * Get tracking categories (used for location tracking across IAGTM sites).
 * @param {string} tenant - 'grl' or 'pagema' (default: grl)
 */
export function getTrackingCategories(tenant) {
  return apiRequest('/TrackingCategories', { tenant });
}

/**
 * Get tax rates.
 * @param {string} tenant - 'grl' or 'pagema' (default: grl)
 */
export function getTaxRates(tenant) {
  return apiRequest('/TaxRates', { tenant });
}

/**
 * Get organisation details.
 * @param {string} tenant - 'grl' or 'pagema' (default: grl)
 */
export function getOrganisation(tenant) {
  return apiRequest('/Organisation', { tenant });
}
