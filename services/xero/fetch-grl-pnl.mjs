/**
 * Fetch GRL (Greek Restaurant Ltd) P&L for Dec 2025, Jan 2026, Feb 2026
 * GRL = Paddington (single location, no tracking categories needed)
 */
import { getProfitAndLoss } from '../../services/xero/xero-client.js';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const months = [
  { key: '2025-12', from: '2025-12-01', to: '2025-12-31', label: 'December 2025' },
  { key: '2026-01', from: '2026-01-01', to: '2026-01-31', label: 'January 2026' },
  { key: '2026-02', from: '2026-02-01', to: '2026-02-28', label: 'February 2026' },
];

function parseReport(report) {
  const sections = [];
  for (const section of report.Rows) {
    if (section.RowType === 'Section') {
      const sectionData = { title: section.Title || '', rows: [], total: null };
      if (section.Rows) {
        for (const row of section.Rows) {
          if (!row.Cells || row.Cells.length < 2) continue;
          const label = row.Cells[0].Value || '';
          const amount = parseFloat(row.Cells[1].Value) || 0;
          if (row.RowType === 'SummaryRow') {
            sectionData.total = { account: label, amount };
          } else {
            sectionData.rows.push({ account: label, amount });
          }
        }
      }
      sections.push(sectionData);
    }
  }
  return sections;
}

async function main() {
  const result = {
    entity: 'Greek Restaurant Ltd',
    location: 'Paddington',
    months: {},
  };

  for (const month of months) {
    console.log(`Fetching P&L for ${month.label}...`);
    const response = await getProfitAndLoss(month.from, month.to, { tenant: 'grl' });

    // Save raw response for debugging
    await writeFile(
      join(__dirname, `grl-pnl-raw-${month.key}.json`),
      JSON.stringify(response, null, 2)
    );

    const report = response.Reports[0];
    const sections = parseReport(report);
    result.months[month.key] = { label: month.label, sections };
    console.log(`  Got ${sections.length} sections`);
  }

  const outPath = join(__dirname, 'grl-pnl-paddington-dec25-feb26.json');
  await writeFile(outPath, JSON.stringify(result, null, 2));
  console.log(`\nStructured data saved to ${outPath}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
