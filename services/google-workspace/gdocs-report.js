/**
 * IAGTM Branded Google Docs Report Generator
 *
 * Creates professionally styled Google Docs with IAGTM brand identity:
 * navy headers, gold accents, branded tables with alternating rows.
 *
 * This is the preferred method for creating branded reports that live in
 * Google Drive and support collaboration (comments, suggestions, sharing).
 *
 * Architecture:
 *   1. Create empty Google Doc via gws CLI
 *   2. Insert all text content with [TABLE_N] placeholders
 *   3. Apply heading paragraph styles (HEADING_1, HEADING_2)
 *   4. Replace each placeholder with a native Google Docs table
 *   5. Populate table cells (reverse index order to preserve offsets)
 *   6. Apply IAGTM brand styling in batches of 80 requests
 *   7. Optionally move to a Drive folder
 *
 * Uses gws CLI directly via child_process (bypasses gws-wrapper.js stderr
 * parsing issue with large batchUpdate payloads).
 *
 * Usage:
 *   import { createBrandedReport } from './gdocs-report.js';
 *
 *   const { documentId, url } = await createBrandedReport(
 *     'Weekly Performance Report — W/C 2026-03-10',
 *     [
 *       { type: 'heading', level: 1, text: 'Revenue Summary' },
 *       { type: 'text', text: 'All locations performed above target this week.', bold: true },
 *       { type: 'table', headers: ['Location', 'Revenue', 'Target'], rows: [['Paddington', '£45,000', '£40,000']] },
 *       { type: 'spacer' },
 *       { type: 'heading', level: 2, text: 'Notes' },
 *       { type: 'text', text: 'Chiswick opened on Thursday.' },
 *     ],
 *     { folderId: '1FQbnbi7wB0XkOneNwtqeCCf6C4uiKKZr' }
 *   );
 *
 * CLI test:
 *   node gdocs-report.js test
 *
 * Registered in services/REGISTRY.md
 */

import { execFile } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GWS_BIN = join(__dirname, 'node_modules', '.bin', 'gws');

// ---------------------------------------------------------------------------
// IAGTM Brand Colours (Google Docs API uses 0–1 floats)
// ---------------------------------------------------------------------------

const BRAND = {
  navy:      { red: 0.102, green: 0.212, blue: 0.365 },  // #1a365d
  white:     { red: 1, green: 1, blue: 1 },
  gold:      { red: 0.82, green: 0.63, blue: 0.21 },     // #d1a135
  lightGrey: { red: 0.95, green: 0.96, blue: 0.97 },     // #f2f5f7
  totalRow:  { red: 0.9, green: 0.93, blue: 0.96 },      // blue-tinted total
  black:     { red: 0, green: 0, blue: 0 },
};

// ---------------------------------------------------------------------------
// Direct gws CLI execution (bypasses wrapper stderr handling bug)
// ---------------------------------------------------------------------------

/**
 * Execute a gws command directly, parsing JSON from stdout.
 * gws emits "Using keyring backend: keyring" to stderr which confuses
 * the wrapper's error handling on large batchUpdate payloads.
 *
 * @param {string} command - gws command, e.g. 'docs documents create'
 * @param {object} [params] - URL/query params (--params JSON)
 * @param {object} [jsonBody] - Request body (--json JSON)
 * @param {number} [timeout=60000] - Timeout in ms
 * @returns {Promise<object>} Parsed JSON response
 */
function gwsDirect(command, params, jsonBody, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const args = command.split(/\s+/);
    if (params) args.push('--params', JSON.stringify(params));
    if (jsonBody) args.push('--json', JSON.stringify(jsonBody));
    args.push('--format', 'json');
    execFile(GWS_BIN, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      // gws outputs "Using keyring backend: keyring" to stderr — ignore it
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { resolve(JSON.parse(jsonMatch[0])); return; } catch { /* fall through */ }
      }
      if (err) reject(new Error(stderr || stdout || err.message));
      else reject(new Error('No JSON in gws response'));
    });
  });
}

// ---------------------------------------------------------------------------
// Core: createBrandedReport
// ---------------------------------------------------------------------------

/**
 * Create a branded IAGTM Google Doc report.
 *
 * @param {string} title - Document title (appears in Drive and as doc title)
 * @param {Array<Section>} sections - Content sections (see type definitions below)
 * @param {object} [options]
 * @param {string} [options.folderId] - Google Drive folder ID to move the doc into
 * @param {string} [options.subtitle] - Subtitle text (gold, below title)
 * @param {boolean} [options.addTimestamp=true] - Add generation timestamp to subtitle
 * @returns {Promise<{documentId: string, url: string}>}
 *
 * Section types:
 *   { type: 'heading', level: 1|2, text: string }
 *   { type: 'text', text: string, bold?: boolean, italic?: boolean }
 *   { type: 'table', headers: string[], rows: string[][] }
 *   { type: 'spacer' }
 */
export async function createBrandedReport(title, sections, options = {}) {
  const { folderId, subtitle, addTimestamp = true } = options;

  // Step 1: Create empty Google Doc
  console.log(`[gdocs-report] Creating document: ${title}`);
  const doc = await gwsDirect('docs documents create', null, { title });
  const documentId = doc.documentId;
  const url = `https://docs.google.com/document/d/${documentId}/edit`;
  console.log(`[gdocs-report] Document created: ${url}`);

  // Step 2: Build text content with [TABLE_N] placeholders
  const { textContent, tableMap, headingRanges } = buildTextContent(title, subtitle, addTimestamp, sections);

  // Step 3: Insert all text at once
  console.log(`[gdocs-report] Inserting text content (${textContent.length} chars)`);
  await gwsDirect('docs documents batchUpdate', { documentId }, {
    requests: [{ insertText: { location: { index: 1 }, text: textContent } }],
  });

  // Step 4: Apply heading styles
  const headingRequests = buildHeadingRequests(headingRanges);
  if (headingRequests.length > 0) {
    console.log(`[gdocs-report] Applying ${headingRequests.length} heading styles`);
    await sendBatchRequests(documentId, headingRequests);
  }

  // Step 5: Style title and subtitle text
  const titleStyleRequests = buildTitleStyleRequests(title, subtitle, addTimestamp);
  if (titleStyleRequests.length > 0) {
    await sendBatchRequests(documentId, titleStyleRequests);
  }

  // Step 6: Re-read doc to get current content indices (headings shifted things)
  const currentDoc = await gwsDirect('docs documents get', { documentId });

  // Step 7: Insert tables (replace placeholders, working in reverse order)
  if (tableMap.length > 0) {
    console.log(`[gdocs-report] Inserting ${tableMap.length} table(s)`);
    await insertTables(documentId, currentDoc, tableMap);
  }

  // Step 8: Move to folder if specified
  if (folderId) {
    console.log(`[gdocs-report] Moving to folder: ${folderId}`);
    await gwsDirect('drive files update', {
      fileId: documentId,
      addParents: folderId,
      supportsAllDrives: true,
      fields: 'id',
    }, {});
  }

  console.log(`[gdocs-report] Done: ${url}`);
  return { documentId, url };
}

// ---------------------------------------------------------------------------
// Text Content Builder
// ---------------------------------------------------------------------------

/**
 * Build the full text content string with [TABLE_N] placeholders,
 * and track heading positions for later styling.
 */
function buildTextContent(title, subtitle, addTimestamp, sections) {
  const lines = [];
  const headingRanges = [];
  const tableMap = []; // { placeholderIndex, headers, rows }
  let tableCounter = 0;

  // Title line
  lines.push(title);
  lines.push('');

  // Subtitle line
  if (subtitle || addTimestamp) {
    const parts = [];
    if (subtitle) parts.push(subtitle);
    if (addTimestamp) parts.push(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
    lines.push(parts.join(' — '));
    lines.push('');
  }

  // Process sections
  for (const section of sections) {
    switch (section.type) {
      case 'heading': {
        const text = section.text || '';
        headingRanges.push({ text, level: section.level || 1 });
        lines.push(text);
        lines.push('');
        break;
      }
      case 'text': {
        lines.push(section.text || '');
        lines.push('');
        break;
      }
      case 'table': {
        const placeholder = `[TABLE_${tableCounter}]`;
        tableMap.push({
          placeholder,
          headers: section.headers || [],
          rows: section.rows || [],
        });
        lines.push(placeholder);
        lines.push('');
        tableCounter++;
        break;
      }
      case 'spacer': {
        lines.push('');
        break;
      }
      default:
        // Unknown section type, skip
        break;
    }
  }

  const textContent = lines.join('\n');

  // Calculate heading start/end indices in the text
  let offset = 1; // Google Docs indices start at 1
  const computedHeadings = [];
  for (const line of lines) {
    const heading = headingRanges.find(h => h.text === line && !h._used);
    if (heading) {
      computedHeadings.push({
        text: heading.text,
        level: heading.level,
        startIndex: offset,
        endIndex: offset + line.length + 1, // +1 for newline
      });
      heading._used = true;
    }
    offset += line.length + 1; // +1 for newline character
  }

  return { textContent, tableMap, headingRanges: computedHeadings };
}

// ---------------------------------------------------------------------------
// Heading Style Requests
// ---------------------------------------------------------------------------

function buildHeadingRequests(headingRanges) {
  return headingRanges.map(h => ({
    updateParagraphStyle: {
      range: { startIndex: h.startIndex, endIndex: h.endIndex },
      paragraphStyle: {
        namedStyleType: h.level === 1 ? 'HEADING_1' : 'HEADING_2',
      },
      fields: 'namedStyleType',
    },
  }));
}

// ---------------------------------------------------------------------------
// Title & Subtitle Styling
// ---------------------------------------------------------------------------

function buildTitleStyleRequests(title, subtitle, addTimestamp) {
  const requests = [];

  // Title: navy, 20pt, bold (first line)
  const titleEnd = 1 + title.length;
  requests.push({
    updateTextStyle: {
      range: { startIndex: 1, endIndex: titleEnd },
      textStyle: {
        bold: true,
        fontSize: { magnitude: 20, unit: 'PT' },
        foregroundColor: { color: { rgbColor: BRAND.navy } },
      },
      fields: 'bold,fontSize,foregroundColor',
    },
  });

  // Subtitle: gold, 11pt
  if (subtitle || addTimestamp) {
    // Subtitle starts after title + newline + blank line newline
    const subtitleStart = titleEnd + 1 + 1; // title\n + \n
    const parts = [];
    if (subtitle) parts.push(subtitle);
    if (addTimestamp) parts.push(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
    const subtitleText = parts.join(' — ');
    const subtitleEnd = subtitleStart + subtitleText.length;

    requests.push({
      updateTextStyle: {
        range: { startIndex: subtitleStart, endIndex: subtitleEnd },
        textStyle: {
          fontSize: { magnitude: 11, unit: 'PT' },
          foregroundColor: { color: { rgbColor: BRAND.gold } },
        },
        fields: 'fontSize,foregroundColor',
      },
    });
  }

  // Style all headings: navy, 14pt, bold
  // (These are applied via namedStyleType, but we add explicit formatting too)

  return requests;
}

// ---------------------------------------------------------------------------
// Table Insertion
// ---------------------------------------------------------------------------

/**
 * Replace [TABLE_N] placeholders with native Google Docs tables.
 * Processes tables in reverse order to preserve document indices.
 */
async function insertTables(documentId, currentDoc, tableMap) {
  // Find placeholder positions in current document
  const body = currentDoc.body?.content || [];
  const placeholderPositions = [];

  for (const element of body) {
    if (!element.paragraph) continue;
    const paraText = (element.paragraph.elements || [])
      .map(el => el.textRun?.content || '')
      .join('');

    for (const table of tableMap) {
      if (paraText.includes(table.placeholder)) {
        placeholderPositions.push({
          ...table,
          startIndex: element.startIndex,
          endIndex: element.endIndex,
        });
      }
    }
  }

  // Sort by startIndex descending (process from end to preserve indices)
  placeholderPositions.sort((a, b) => b.startIndex - a.startIndex);

  for (const table of placeholderPositions) {
    await insertSingleTable(documentId, table);
  }
}

/**
 * Insert a single table: delete placeholder text, insert table, populate cells, style.
 */
async function insertSingleTable(documentId, table) {
  const { headers, rows, startIndex, endIndex } = table;
  const numRows = rows.length + 1; // +1 for header row
  const numCols = headers.length;

  if (numCols === 0) return;

  // Step A: Delete the placeholder text
  await gwsDirect('docs documents batchUpdate', { documentId }, {
    requests: [{
      deleteContentRange: {
        range: { startIndex, endIndex: endIndex - 1 }, // keep trailing newline
      },
    }],
  });

  // Step B: Insert table at the same position
  await gwsDirect('docs documents batchUpdate', { documentId }, {
    requests: [{
      insertTable: {
        location: { index: startIndex },
        rows: numRows,
        columns: numCols,
      },
    }],
  });

  // Step C: Re-read the doc to find the new table's cell indices
  const updatedDoc = await gwsDirect('docs documents get', { documentId });
  const docTable = findTableAt(updatedDoc, startIndex);
  if (!docTable) {
    console.warn(`[gdocs-report] Could not find inserted table at index ${startIndex}`);
    return;
  }

  // Step D: Populate cells in reverse order (to preserve indices)
  const allCellData = [];

  // Header row
  const headerRow = docTable.tableRows[0];
  for (let c = 0; c < numCols; c++) {
    const cell = headerRow.tableCells[c];
    if (!cell) continue;
    const cellIndex = getCellContentIndex(cell);
    allCellData.push({ index: cellIndex, text: headers[c] || '' });
  }

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    const tableRow = docTable.tableRows[r + 1];
    if (!tableRow) continue;
    for (let c = 0; c < numCols; c++) {
      const cell = tableRow.tableCells[c];
      if (!cell) continue;
      const cellIndex = getCellContentIndex(cell);
      const value = rows[r][c] != null ? String(rows[r][c]) : '';
      allCellData.push({ index: cellIndex, text: value });
    }
  }

  // Sort by index descending for safe insertion
  allCellData.sort((a, b) => b.index - a.index);

  const insertRequests = allCellData.map(cd => ({
    insertText: {
      location: { index: cd.index },
      text: cd.text,
    },
  }));

  if (insertRequests.length > 0) {
    await sendBatchRequests(documentId, insertRequests);
  }

  // Step E: Apply brand styling to the table
  await styleTable(documentId, docTable, numRows, numCols, headers, rows);
}

/**
 * Find a table element near a given document index.
 */
function findTableAt(doc, nearIndex) {
  const body = doc.body?.content || [];
  for (const element of body) {
    if (element.table && element.startIndex >= nearIndex - 2 && element.startIndex <= nearIndex + 5) {
      return element.table;
    }
  }
  // Fallback: find the closest table
  let closest = null;
  let minDist = Infinity;
  for (const element of body) {
    if (element.table) {
      const dist = Math.abs(element.startIndex - nearIndex);
      if (dist < minDist) {
        minDist = dist;
        closest = element.table;
      }
    }
  }
  return closest;
}

/**
 * Get the content insertion index for a table cell.
 */
function getCellContentIndex(cell) {
  const content = cell.content || [];
  if (content.length > 0 && content[0].paragraph) {
    const elements = content[0].paragraph.elements || [];
    if (elements.length > 0) {
      return elements[0].startIndex;
    }
  }
  return cell.startIndex + 1;
}

// ---------------------------------------------------------------------------
// Table Styling
// ---------------------------------------------------------------------------

/**
 * Apply IAGTM brand styling to a table:
 * - Navy header row with white bold text
 * - Alternating light grey rows
 * - Blue-tinted total row (last row if >3 rows)
 * - 9pt font, 4pt padding
 */
async function styleTable(documentId, docTable, numRows, numCols, headers, rows) {
  const requests = [];

  // Style each row
  for (let r = 0; r < numRows; r++) {
    const tableRow = docTable.tableRows[r];
    if (!tableRow) continue;

    const isHeader = r === 0;
    const isLastRow = r === numRows - 1;
    const isTotalRow = isLastRow && numRows > 3;
    const isEvenDataRow = !isHeader && (r % 2 === 0);

    // Determine row background
    let bgColor;
    if (isHeader) {
      bgColor = BRAND.navy;
    } else if (isTotalRow) {
      bgColor = BRAND.totalRow;
    } else if (isEvenDataRow) {
      bgColor = BRAND.lightGrey;
    }

    for (let c = 0; c < numCols; c++) {
      const cell = tableRow.tableCells[c];
      if (!cell) continue;

      const cellStart = getCellContentIndex(cell);
      const cellText = getCellText(cell);
      const cellEnd = cellStart + cellText.length;

      // Text styling
      if (cellEnd > cellStart) {
        const textStyle = {
          fontSize: { magnitude: 9, unit: 'PT' },
        };

        if (isHeader) {
          textStyle.bold = true;
          textStyle.foregroundColor = { color: { rgbColor: BRAND.white } };
        } else if (isTotalRow) {
          textStyle.bold = true;
          textStyle.foregroundColor = { color: { rgbColor: BRAND.navy } };
        } else {
          textStyle.foregroundColor = { color: { rgbColor: BRAND.black } };
        }

        requests.push({
          updateTextStyle: {
            range: { startIndex: cellStart, endIndex: cellEnd },
            textStyle,
            fields: 'fontSize,bold,foregroundColor',
          },
        });
      }

      // Cell background and padding via tableCellStyle
      if (bgColor) {
        requests.push({
          updateTableCellStyle: {
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: docTable.tableRows[0].tableCells[0].content[0]?.paragraph?.elements?.[0]?.startIndex - 2 || 1 },
                rowIndex: r,
                columnIndex: c,
              },
              rowSpan: 1,
              columnSpan: 1,
            },
            tableCellStyle: {
              backgroundColor: { color: { rgbColor: bgColor } },
              paddingTop: { magnitude: 4, unit: 'PT' },
              paddingBottom: { magnitude: 4, unit: 'PT' },
              paddingLeft: { magnitude: 4, unit: 'PT' },
              paddingRight: { magnitude: 4, unit: 'PT' },
            },
            fields: 'backgroundColor,paddingTop,paddingBottom,paddingLeft,paddingRight',
          },
        });
      } else {
        // Even for non-colored rows, set padding
        requests.push({
          updateTableCellStyle: {
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: docTable.tableRows[0].tableCells[0].content[0]?.paragraph?.elements?.[0]?.startIndex - 2 || 1 },
                rowIndex: r,
                columnIndex: c,
              },
              rowSpan: 1,
              columnSpan: 1,
            },
            tableCellStyle: {
              paddingTop: { magnitude: 4, unit: 'PT' },
              paddingBottom: { magnitude: 4, unit: 'PT' },
              paddingLeft: { magnitude: 4, unit: 'PT' },
              paddingRight: { magnitude: 4, unit: 'PT' },
            },
            fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight',
          },
        });
      }
    }
  }

  if (requests.length > 0) {
    console.log(`[gdocs-report] Applying ${requests.length} style requests to table`);
    await sendBatchRequests(documentId, requests);
  }
}

/**
 * Extract plain text from a table cell.
 */
function getCellText(cell) {
  const content = cell.content || [];
  let text = '';
  for (const ce of content) {
    if (ce.paragraph) {
      for (const el of (ce.paragraph.elements || [])) {
        text += el.textRun?.content || '';
      }
    }
  }
  // Strip trailing newline that Google Docs adds to cells
  return text.replace(/\n$/, '');
}

// ---------------------------------------------------------------------------
// Batch Request Helper (sends in chunks of 80)
// ---------------------------------------------------------------------------

const BATCH_SIZE = 80;

/**
 * Send batchUpdate requests in chunks of BATCH_SIZE to avoid API limits.
 *
 * @param {string} documentId
 * @param {object[]} requests - Array of Docs API request objects
 */
async function sendBatchRequests(documentId, requests) {
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const chunk = requests.slice(i, i + BATCH_SIZE);
    await gwsDirect('docs documents batchUpdate', { documentId }, {
      requests: chunk,
    });
  }
}

// ---------------------------------------------------------------------------
// CLI Test Mode
// ---------------------------------------------------------------------------

if (process.argv[1]?.endsWith('gdocs-report.js')) {
  const action = process.argv[2];

  if (action === 'test') {
    console.log('=== IAGTM Branded Google Docs Report — Test Mode ===\n');

    const result = await createBrandedReport(
      'IAGTM Weekly Performance Report — Test',
      [
        { type: 'heading', level: 1, text: 'Revenue by Location' },
        { type: 'text', text: 'All six locations reporting. Chiswick continues strong post-launch growth.' },
        {
          type: 'table',
          headers: ['Location', 'Revenue', 'vs Target', 'Food Cost %', 'Status'],
          rows: [
            ['Paddington', '£45,230', '+12%', '28.1%', 'On Track'],
            ['Shoreditch', '£38,100', '+8%', '29.3%', 'On Track'],
            ['Brent Cross', '£31,450', '+3%', '31.2%', 'Watch'],
            ['Wandsworth', '£28,700', '+5%', '27.8%', 'On Track'],
            ['Peckham', '£22,100', '-2%', '33.5%', 'Alert'],
            ['Chiswick', '£18,900', '+15%', '26.9%', 'On Track'],
            ['TOTAL', '£184,480', '+7%', '29.5%', '—'],
          ],
        },
        { type: 'spacer' },
        { type: 'heading', level: 2, text: 'Top Selling Items This Week' },
        { type: 'text', text: 'Gyros remains the top seller across all locations, with souvlaki close behind.' },
        {
          type: 'table',
          headers: ['Rank', 'Item', 'Units Sold', 'Revenue', 'Avg Price'],
          rows: [
            ['1', 'Chicken Gyros', '1,245', '£14,940', '£12.00'],
            ['2', 'Pork Souvlaki', '1,102', '£12,122', '£11.00'],
            ['3', 'Halloumi Wrap', '876', '£9,636', '£11.00'],
            ['4', 'Greek Salad', '654', '£5,886', '£9.00'],
            ['5', 'Lamb Chops', '412', '£7,416', '£18.00'],
          ],
        },
        { type: 'spacer' },
        { type: 'heading', level: 2, text: 'Key Insights' },
        { type: 'text', text: 'Peckham food cost is 3.5% above target — investigate supplier pricing and waste levels. Chiswick is exceeding launch projections by 15%, driven by strong Uber Eats performance.', italic: true },
      ],
      {
        subtitle: "It's All Greek To Me — 6 Locations",
        addTimestamp: true,
      }
    );

    console.log(`\nTest report created successfully!`);
    console.log(`  Document ID: ${result.documentId}`);
    console.log(`  URL: ${result.url}`);

  } else {
    console.log(`IAGTM Branded Google Docs Report Generator

Usage:
  node gdocs-report.js test                          Create a sample report with 2 tables

Programmatic:
  import { createBrandedReport } from './gdocs-report.js';
  const { documentId, url } = await createBrandedReport(title, sections, options);

Section types:
  { type: 'heading', level: 1|2, text: '...' }
  { type: 'text', text: '...', bold?: true, italic?: true }
  { type: 'table', headers: [...], rows: [[...], ...] }
  { type: 'spacer' }

Options:
  folderId      Google Drive folder ID to move the doc into
  subtitle      Subtitle text (rendered in gold below title)
  addTimestamp  Add generation timestamp to subtitle (default: true)
`);
  }
}

export { gwsDirect };
