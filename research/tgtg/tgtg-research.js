import 'dotenv/config';
import { LOCATIONS, getPaymentMethods, getAllFinancials } from './lightspeed-client.js';
import { writeFile } from 'fs/promises';

const FROM = '2026-01-14T00:00:00+00:00';
const TO = '2026-03-14T23:59:59+00:00';
const OUTPUT = '/Users/michaelai/claude-work-folder/iagtm-agent/research/tgtg/tgtg-results.json';

async function run() {
  console.log('=== TGTG / Good To Go Research ===');
  console.log(`Period: ${FROM} to ${TO}\n`);

  console.log('--- STEP 1: Payment Methods ---\n');

  for (const [name, blId] of Object.entries(LOCATIONS)) {
    try {
      const methods = await getPaymentMethods(blId);
      const arr = Array.isArray(methods.paymentMethods || methods) ? (methods.paymentMethods || methods) : [];
      const tgtg = arr.filter(m => {
        const l = (m.name || m.label || '').toLowerCase();
        return l.includes('good') || l.includes('tgtg');
      });
      console.log(`${name.toUpperCase()}: ${arr.length} methods`);
      if (tgtg.length) tgtg.forEach(m => console.log(`  TGTG: ${JSON.stringify(m)}`));
      else console.log(`  All: ${arr.map(m => m.name || m.label || 'unnamed').join(', ')}`);
    } catch (e) { console.log(`${name}: ERROR ${e.message}`); }
  }

  console.log('\n--- STEP 2: Sales Analysis ---\n');
  const results = {};

  for (const [name, blId] of Object.entries(LOCATIONS)) {
    console.log(`Fetching ${name}...`);
    try {
      const sales = await getAllFinancials(blId, FROM, TO, { include: 'payments' });
      console.log(`  ${sales.length} receipts`);

      const tgtgSales = [];
      const pmNames = new Set();

      for (const sale of sales) {
        let hit = false;
        if (sale.payments) {
          for (const p of sale.payments) {
            pmNames.add(p.paymentMethodName || p.name || 'unknown');
            const mn = (p.paymentMethodName || p.name || '').toLowerCase();
            if (mn.includes('good') || mn.includes('tgtg')) hit = true;
          }
        }
        if (sale.lines) {
          for (const line of sale.lines) {
            const n = (line.name || line.sku || '').toLowerCase();
            if (n.includes('good') || n.includes('tgtg')) hit = true;
          }
        }
        if (hit) tgtgSales.push(sale);
      }

      console.log(`  Payment methods: ${[...pmNames].join(', ')}`);

      if (tgtgSales.length) {
        let rev = 0; const items = {}; const daily = {}; const tpm = new Set();
        for (const s of tgtgSales) {
          rev += s.totalWithTax || s.totalAmount || 0;
          const d = (s.date || s.createdAt || '').substring(0, 10);
          daily[d] = (daily[d] || 0) + 1;
          if (s.lines) for (const l of s.lines) {
            if (!l.parentLineId) {
              const n = l.name || l.sku || 'unknown';
              if (!items[n]) items[n] = { count: 0, revenue: 0 };
              items[n].count += (l.quantity || 1);
              items[n].revenue += (l.totalNetAmountWithTax || 0);
            }
          }
          if (s.payments) s.payments.forEach(p => tpm.add(p.paymentMethodName || p.name));
        }
        const sorted = Object.entries(items).sort((a, b) => b[1].count - a[1].count);
        console.log(`  TGTG: ${tgtgSales.length} receipts, £${rev.toFixed(2)}`);
        console.log(`  Pay methods: ${[...tpm].join(', ')}`);
        console.log(`  Top items:`);
        sorted.slice(0, 15).forEach(([i, d]) => console.log(`    ${i}: ${d.count}x £${d.revenue.toFixed(2)}`));
        console.log(`  Daily:`);
        Object.entries(daily).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([d,c])=>console.log(`    ${d}: ${c}`));
        console.log(`\n  Sample receipt:`);
        console.log(JSON.stringify(tgtgSales[0], null, 2).substring(0, 2000));
        results[name] = { receipts: tgtgSales.length, revenue: rev, items: sorted, dailyCounts: daily, totalReceipts: sales.length, sampleReceipts: tgtgSales.slice(0, 3) };
      } else {
        console.log(`  No TGTG sales`);
        results[name] = { receipts: 0, revenue: 0, totalReceipts: sales.length };
      }
    } catch (e) { console.log(`  ERROR: ${e.message}`); results[name] = { error: e.message }; }
  }

  console.log('\n=== SUMMARY ===\n');
  let t = 0, tr = 0;
  for (const [n, d] of Object.entries(results)) {
    if (d.error) { console.log(`${n}: ERROR`); continue; }
    t += d.receipts; tr += d.revenue;
    const pct = d.totalReceipts > 0 ? ((d.receipts / d.totalReceipts) * 100).toFixed(2) : '0';
    console.log(`${n}: ${d.receipts} TGTG (${pct}% of ${d.totalReceipts}), £${d.revenue.toFixed(2)}`);
  }
  console.log(`\nTOTAL: ${t} receipts, £${tr.toFixed(2)}`);
  await writeFile(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`Saved to ${OUTPUT}`);
}

run().catch(console.error);
