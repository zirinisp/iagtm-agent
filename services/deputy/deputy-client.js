import 'dotenv/config';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: `${__dirname}/.env` });

const { DEPUTY_API_BASE, DEPUTY_TOKEN } = process.env;

if (!DEPUTY_API_BASE || !DEPUTY_TOKEN) {
  throw new Error('Missing DEPUTY_API_BASE or DEPUTY_TOKEN in environment');
}

/**
 * Mapping from Company (location) IDs to OperationalUnit (area) IDs.
 * Rosters and Timesheets link to areas, not locations — use this to filter by location.
 */
export const LOCATION_AREAS = {
  1:  [5, 9, 22, 33],      // Paddington BOH
  4:  [18, 21],             // Remote
  5:  [25, 35, 38],         // Shoreditch
  6:  [26, 27, 32, 43],     // Paddington FOH
  7:  [34, 36, 37],         // Brent
  8:  [40, 41, 42],         // Wandsworth
  9:  [48, 49, 50, 51],     // Peckham
  11: [52, 53, 54],         // Tallinn
  12: [55, 56],             // Chiswick
};

/** Get all area IDs for a location. For "Paddington" (both FOH+BOH), pass [1, 6]. */
export function getAreaIdsForLocation(locationId) {
  return LOCATION_AREAS[locationId] || [];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a JS Date (or date string) to unix timestamp (seconds). */
export function toUnix(date) {
  return Math.floor(new Date(date).getTime() / 1000);
}

/** Convert unix timestamp (seconds) to JS Date. */
export function fromUnix(ts) {
  return new Date(ts * 1000);
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Make an authenticated API request to Deputy.
 * @param {string} path - API path (e.g. '/v1/me' or '/v1/resource/Employee/1')
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} parsed JSON response
 */
export async function apiRequest(path, options = {}) {
  const url = `${DEPUTY_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${DEPUTY_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Deputy API ${response.status} ${path}: ${body}`);
  }

  return response.json();
}

/**
 * Execute a Resource API QUERY against a Deputy object.
 * POST /v1/resource/{objectName}/QUERY
 *
 * @param {string} objectName - Resource object (e.g. 'Roster', 'Timesheet', 'Employee')
 * @param {object} queryBody  - Query payload with search, sort, join, start, max, etc.
 * @returns {Promise<any[]>} array of matching records
 */
export async function resourceQuery(objectName, queryBody = {}) {
  return apiRequest(`/v1/resource/${objectName}/QUERY`, {
    method: 'POST',
    body: queryBody,
  });
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

/**
 * List employees via the v2 Management API (cursor pagination, field masks).
 * @param {object} options
 * @param {string} [options.fieldMask] - Comma-separated fields (e.g. 'firstName,lastName,displayName')
 * @param {string} [options.cursor] - Pagination cursor from previous response
 * @returns {Promise<any>} employee list with pagination info
 */
export async function getEmployees(options = {}) {
  const params = new URLSearchParams();
  if (options.fieldMask) params.set('fieldMask', options.fieldMask);
  if (options.cursor) params.set('cursor', options.cursor);
  const qs = params.toString();
  return apiRequest(`/management/v2/employees${qs ? `?${qs}` : ''}`);
}

/**
 * Get a single employee by ID.
 * @param {number} id - Employee ID
 * @returns {Promise<any>} employee record
 */
export async function getEmployee(id) {
  return apiRequest(`/v1/resource/Employee/${id}`);
}

// ---------------------------------------------------------------------------
// Locations & Areas
// ---------------------------------------------------------------------------

/**
 * Get all locations (Company objects).
 * @returns {Promise<any[]>} array of Company records
 */
export async function getLocations() {
  return apiRequest('/v1/resource/Company');
}

/**
 * Get all areas (OperationalUnit objects).
 * @returns {Promise<any[]>} array of OperationalUnit records
 */
export async function getAreas() {
  return apiRequest('/v1/resource/OperationalUnit');
}

/**
 * Get areas for a specific location.
 * @param {number} locationId - Company ID
 * @returns {Promise<any[]>} array of OperationalUnit records for that location
 */
export async function getAreasForLocation(locationId) {
  return resourceQuery('OperationalUnit', {
    search: {
      s1: { field: 'Company', data: locationId, type: 'eq' },
    },
  });
}

// ---------------------------------------------------------------------------
// Schedules / Rosters
// ---------------------------------------------------------------------------

/**
 * Query rosters (shifts) within a date range, optionally filtered by location.
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate   - End date
 * @param {number} [locationId]   - Optional Company ID to filter by
 * @returns {Promise<any[]>} array of Roster records with joined Employee and Area data
 */
export async function getRosters(startDate, endDate, locationId) {
  const search = {
    s1: { field: 'StartTime', data: toUnix(startDate), type: 'ge' },
    s2: { field: 'EndTime', data: toUnix(endDate), type: 'le' },
  };
  if (locationId) {
    const areaIds = getAreaIdsForLocation(locationId);
    if (areaIds.length === 0) throw new Error(`Unknown location ID: ${locationId}`);
    search.s3 = { field: 'OperationalUnit', data: areaIds, type: 'in' };
  }
  return resourceQuery('Roster', {
    search,
    sort: { StartTime: 'asc' },
    join: ['EmployeeObject', 'OperationalUnitObject'],
    max: 500,
  });
}

/**
 * Create a roster (shift) via the Supervise API.
 * @param {object} rosterData - Roster fields (intStartTimestamp, intEndTimestamp, intRosterEmployee, intOpunitId, etc.)
 * @returns {Promise<any>} created roster record
 */
export async function createRoster(rosterData) {
  return apiRequest('/v1/supervise/roster', {
    method: 'POST',
    body: rosterData,
  });
}

/**
 * Publish rosters and optionally notify employees.
 * @param {number[]} rosterIds - Array of Roster IDs to publish
 * @param {number} [notificationMode=4] - 1=SMS+Email, 2=SMS, 3=Email, 4=None, 5=Confirmation required
 * @returns {Promise<any>} publish result
 */
export async function publishRosters(rosterIds, notificationMode = 4) {
  return apiRequest('/v1/supervise/roster/publish', {
    method: 'POST',
    body: {
      intMode: notificationMode,
      blnAllLocationsMode: 0,
      intRosterArray: rosterIds,
    },
  });
}

// ---------------------------------------------------------------------------
// Timesheets
// ---------------------------------------------------------------------------

/**
 * Query timesheets within a date range, optionally filtered by location.
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate   - End date
 * @param {number} [locationId]   - Optional Company ID to filter by
 * @returns {Promise<any[]>} array of Timesheet records with joined Employee and Area data
 */
export async function getTimesheets(startDate, endDate, locationId) {
  const search = {
    s1: { field: 'StartTime', data: toUnix(startDate), type: 'ge' },
    s2: { field: 'StartTime', data: toUnix(endDate), type: 'le' },
  };
  if (locationId) {
    const areaIds = getAreaIdsForLocation(locationId);
    if (areaIds.length === 0) throw new Error(`Unknown location ID: ${locationId}`);
    search.s3 = { field: 'OperationalUnit', data: areaIds, type: 'in' };
  }
  return resourceQuery('Timesheet', {
    search,
    sort: { StartTime: 'asc' },
    join: ['EmployeeObject', 'OperationalUnitObject'],
    max: 500,
  });
}

/**
 * Query timesheet pay data for labour cost analysis.
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate   - End date
 * @returns {Promise<any[]>} array of TimesheetPayReturn records with joined Timesheet data
 */
export async function getTimesheetPayData(startDate, endDate) {
  return resourceQuery('TimesheetPayReturn', {
    search: {
      s1: { field: 'Created', data: toUnix(startDate), type: 'ge' },
      s2: { field: 'Created', data: toUnix(endDate), type: 'le' },
    },
    join: ['TimesheetObject'],
    max: 500,
  });
}

/**
 * Approve a timesheet.
 * @param {number} timesheetId - Timesheet ID to approve
 * @returns {Promise<any>} approval result
 */
export async function approveTimesheet(timesheetId) {
  return apiRequest('/v1/supervise/timesheet/approve', {
    method: 'POST',
    body: { intTimesheetId: timesheetId },
  });
}

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

/**
 * Query leave records within a date range.
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate   - End date
 * @returns {Promise<any[]>} array of Leave records
 */
export async function getLeave(startDate, endDate) {
  return resourceQuery('Leave', {
    search: {
      s1: { field: 'Start', data: toUnix(startDate), type: 'ge' },
      s2: { field: 'Start', data: toUnix(endDate), type: 'le' },
    },
    sort: { DateStart: 'asc' },
    max: 500,
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Get the current authenticated user info. Useful for validating the token.
 * @returns {Promise<any>} current user record
 */
export async function getMe() {
  return apiRequest('/v1/me');
}
