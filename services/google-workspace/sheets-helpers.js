/**
 * Google Sheets Helpers
 *
 * Read, write, append, and create Google Sheets spreadsheets via gws CLI.
 * Requires Sheets API enabled on GCP project 519727030587.
 *
 * Usage:
 *   import { readSheet, writeSheet, createSpreadsheet } from './sheets-helpers.js';
 *   const data = await readSheet('SPREADSHEET_ID', 'Sheet1!A1:D10');
 *   await writeSheet('SPREADSHEET_ID', 'Sheet1!A1', [['Header1', 'Header2'], ['val1', 'val2']]);
 *
 * Registered in services/REGISTRY.md
 */

import { gws } from './gws-wrapper.js';

/**
 * Read a range of cells from a spreadsheet.
 * @param {string} spreadsheetId
 * @param {string} range - e.g. 'Sheet1!A1:D10'
 * @returns {Promise<string[][]>} 2D array of cell values
 */
export async function readSheet(spreadsheetId, range) {
  const result = await gws('sheets spreadsheets values get', {
    params: { spreadsheetId, range },
  });
  return result.values || [];
}

/**
 * Write values to a range (overwrites existing data).
 * @param {string} spreadsheetId
 * @param {string} range - e.g. 'Sheet1!A1'
 * @param {string[][]} values - 2D array of cell values
 * @returns {Promise<object>} Update response
 */
export async function writeSheet(spreadsheetId, range, values) {
  return gws('sheets spreadsheets values update', {
    params: { spreadsheetId, range, valueInputOption: 'RAW' },
    json: { values },
  });
}

/**
 * Append rows to a spreadsheet (adds after existing data).
 * @param {string} spreadsheetId
 * @param {string} range - e.g. 'Sheet1!A:Z'
 * @param {string[][]} values - 2D array of rows to append
 * @returns {Promise<object>} Append response
 */
export async function appendSheet(spreadsheetId, range, values) {
  return gws('sheets spreadsheets values append', {
    params: { spreadsheetId, range, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
    json: { values },
  });
}

/**
 * Create a new spreadsheet.
 * @param {string} title - Spreadsheet title
 * @param {string[]} [sheetNames] - Optional sheet tab names (default: ['Sheet1'])
 * @returns {Promise<object>} Created spreadsheet with id, url
 */
export async function createSpreadsheet(title, sheetNames) {
  const sheets = (sheetNames || ['Sheet1']).map(name => ({
    properties: { title: name },
  }));
  const result = await gws('sheets spreadsheets create', {
    json: { properties: { title }, sheets },
  });
  return {
    spreadsheetId: result.spreadsheetId,
    url: result.spreadsheetUrl,
    title: result.properties?.title,
    sheets: result.sheets?.map(s => s.properties?.title),
  };
}

/**
 * Get spreadsheet metadata (title, sheets, etc).
 * @param {string} spreadsheetId
 * @returns {Promise<object>}
 */
export async function getSpreadsheetInfo(spreadsheetId) {
  return gws('sheets spreadsheets get', {
    params: { spreadsheetId },
  });
}

// --- CLI ---

if (process.argv[1]?.endsWith('sheets-helpers.js')) {
  const [,, action, ...rest] = process.argv;

  if (action === 'create') {
    const title = rest[0] || 'IAGTM Test Sheet';
    const result = await createSpreadsheet(title);
    console.log(`Created: ${result.url}`);
    console.log(JSON.stringify(result, null, 2));
  } else if (action === 'read') {
    const [id, range] = rest;
    if (!id || !range) { console.log('Usage: node sheets-helpers.js read <id> <range>'); process.exit(1); }
    const data = await readSheet(id, range);
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('Usage: node sheets-helpers.js <create|read> [args...]');
  }
}
