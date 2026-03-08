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

// Location IDs (blIds)
export const LOCATIONS = {
  paddington: 243172458364930,
  shoreditch: 243172458369136,
  brent: 243172458370531,
  wandsworth: 243172458373688,
  peckham: 243172458378103,
  chiswick: 243172458383746,
};

const BUSINESS_ID = 14154;

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

export async function getAccessToken() {
  const tokens = await loadTokens();
  return tokens.access_token;
}

/**
 * Re-authorize via browser OAuth flow.
 * Requires CDP Chrome running on port 9222 with an active Lightspeed session.
 */
async function autoReauth() {
  console.log('[lightspeed] Token rejected (403). Attempting auto re-authorization...');
  const { reauthorize } = await import('./reauth.js');
  const tokens = await reauthorize();
  return tokens.access_token;
}

export async function apiRequest(path, options = {}, _retried = false) {
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

  // On 403, attempt auto re-authorization once
  if (response.status === 403 && !_retried) {
    const newToken = await autoReauth();
    // Retry the request with the new token
    const retryResponse = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!retryResponse.ok) {
      const body = await retryResponse.text();
      throw new Error(`API ${retryResponse.status} ${path} (after reauth): ${body}`);
    }
    return retryResponse.json();
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status} ${path}: ${body}`);
  }

  return response.json();
}

// --- Convenience methods for each endpoint pattern ---

/** List all businesses and locations. GET /f/data/businesses */
export async function getBusinesses() {
  return apiRequest('/f/data/businesses');
}

/**
 * Get detailed financial/sales data for a location.
 * GET /f/finance/{blId}/financials/{from}/{to}
 * @param {number} blId - Business location ID
 * @param {string} from - ISO 8601 datetime (e.g. 2026-03-07T00:00:00+00:00)
 * @param {string} to - ISO 8601 datetime
 * @param {object} opts - { include, pageSize, nextPageToken }
 *   include: comma-separated string of: staff,table,consumer,payments,revenue_center,account_profile,payment_authorization
 *   pageSize: max 1000 (default 1000)
 *   nextPageToken: accountId for next page (from _links.nextPage)
 */
export async function getFinancials(blId, from, to, opts = {}) {
  const params = new URLSearchParams();
  if (opts.include) params.set('include', opts.include);
  if (opts.pageSize) params.set('pageSize', opts.pageSize);
  if (opts.nextPageToken) params.set('nextPageToken', opts.nextPageToken);
  const qs = params.toString() ? `?${params}` : '';
  return apiRequest(`/f/finance/${blId}/financials/${encodeURIComponent(from)}/${encodeURIComponent(to)}${qs}`);
}

/**
 * Get all financials across pages.
 * Automatically follows pagination until dataComplete is true.
 */
export async function getAllFinancials(blId, from, to, opts = {}) {
  const allSales = [];
  let nextPageToken = null;
  let dataComplete = false;

  while (!dataComplete) {
    const result = await getFinancials(blId, from, to, {
      ...opts,
      include: opts.include || 'staff,revenue_center,account_profile',
      pageSize: 1000,
      nextPageToken,
    });
    if (result.sales) allSales.push(...result.sales);
    dataComplete = result.dataComplete !== false;
    if (!dataComplete && result._links?.nextPage) {
      const nextUrl = new URL(result._links.nextPage.href);
      nextPageToken = nextUrl.searchParams.get('nextPageToken');
    } else {
      dataComplete = true;
    }
  }

  return allSales;
}

/** Get accounting groups for a location. GET /f/finance/{blId}/accountingGroups */
export async function getAccountingGroups(blId) {
  return apiRequest(`/f/finance/${blId}/accountingGroups`);
}

/** Get payment methods for a location. GET /f/finance/{blId}/paymentMethods */
export async function getPaymentMethods(blId) {
  return apiRequest(`/f/finance/${blId}/paymentMethods`);
}

/** Get tax rates for a location. GET /f/finance/{blId}/tax-rates (hyphenated!) */
export async function getTaxRates(blId) {
  return apiRequest(`/f/finance/${blId}/tax-rates`);
}

/**
 * Get sales via V2 API.
 * GET /f/v2/business-location/{blId}/sales?from=&to=
 * @param {object} opts - { include, pageSize (max 100), nextPageToken }
 */
export async function getSalesV2(blId, from, to, opts = {}) {
  const params = new URLSearchParams({ from, to });
  if (opts.include) params.set('include', opts.include);
  if (opts.pageSize) params.set('pageSize', opts.pageSize);
  if (opts.nextPageToken) params.set('nextPageToken', opts.nextPageToken);
  return apiRequest(`/f/v2/business-location/${blId}/sales?${params}`);
}

/**
 * Get sales for a single business day (V2).
 * GET /f/v2/business-location/{blId}/sales-daily?date=YYYY-MM-DD
 */
export async function getDailySalesV2(blId, date) {
  return apiRequest(`/f/v2/business-location/${blId}/sales-daily?date=${date}`);
}

/**
 * Get Lightspeed Payments terminal data (V2).
 * GET /f/v2/business-location/{blId}/lightspeed-payments?from=&to=
 */
export async function getLightspeedPayments(blId, from, to, opts = {}) {
  const params = new URLSearchParams({ from, to });
  if (opts.pageSize) params.set('pageSize', opts.pageSize);
  if (opts.offset) params.set('offset', opts.offset);
  return apiRequest(`/f/v2/business-location/${blId}/lightspeed-payments?${params}`);
}
