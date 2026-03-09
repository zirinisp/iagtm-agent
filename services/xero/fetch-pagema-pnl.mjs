#!/usr/bin/env node
/**
 * Fetch Pagema Ltd P&L data from Xero API for Dec 2025, Jan 2026, Feb 2026
 * by branch tracking category. Saves raw JSON to pagema-pnl-raw.json.
 */
import { getProfitAndLoss } from '../../services/xero/xero-client.js';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BRANCHES = [
  { name: 'Brent', optionId: '42d7bf0e-f6ce-45a9-8172-30fd7b308aff' },
  { name: 'Chiswick', optionId: '0a08c562-a217-438e-9bc2-2fe80a4d6c7d' },
  { name: 'Peckham', optionId: 'e1d076d7-6e77-423a-9b02-7647dc9b690c' },
  { name: 'Shoreditch', optionId: 'd9a8f6cb-0c2f-4663-8112-36af5aff58df' },
  { name: 'Wandsworth', optionId: '7f42983d-9a9d-4731-aba2-6a9ce85d075f' },
];

const TRACKING_CATEGORY_ID = '8c350f31-8ef3-4556-b5d6-4734d3944c4c';

const MONTHS = [
  { name: 'December 2025', from: '2025-12-01', to: '2025-12-31' },
  { name: 'January 2026', from: '2026-01-01', to: '2026-01-31' },
  { name: 'February 2026', from: '2026-02-01', to: '2026-02-28' },
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const results = {};

  for (const month of MONTHS) {
    console.log(`\n--- Fetching ${month.name} ---`);
    results[month.name] = {};

    // Fetch total (unfiltered)
    console.log(`  Fetching Total...`);
    const total = await getProfitAndLoss(month.from, month.to, { tenant: 'pagema' });
    results[month.name]['Total'] = total;
    await delay(1200); // ~1.2s between calls for safety

    // Fetch each branch
    for (const branch of BRANCHES) {
      console.log(`  Fetching ${branch.name}...`);
      const data = await getProfitAndLoss(month.from, month.to, {
        tenant: 'pagema',
        trackingCategoryID: TRACKING_CATEGORY_ID,
        trackingOptionID: branch.optionId,
      });
      results[month.name][branch.name] = data;
      await delay(1200);
    }
  }

  const outPath = join(__dirname, 'pagema-pnl-raw.json');
  await writeFile(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved raw data to ${outPath}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
