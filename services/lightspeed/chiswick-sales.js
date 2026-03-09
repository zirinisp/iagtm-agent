import 'dotenv/config';
import { LOCATIONS, getDailySalesV2 } from './lightspeed-client.js';

function summariseDay(data) {
  if (!data?.sales?.length) return { orders: 0, gross: 0, net: 0, items: 0, discounts: 0 };
  let gross = 0, net = 0, items = 0, discounts = 0;
  const orders = data.sales.length;
  for (const sale of data.sales) {
    for (const line of sale.salesLines || []) {
      // Skip child lines (modifiers with parentLineId) to avoid double-counting
      if (line.parentLineId) continue;
      const amt = parseFloat(line.totalNetAmountWithTax) || 0;
      gross += amt;
      net += parseFloat(line.totalNetAmountWithoutTax) || 0;
      items += parseFloat(line.quantity) || 0;
      discounts += parseFloat(line.totalDiscountAmount) || 0;
    }
  }
  return { orders, gross: Math.round(gross * 100) / 100, net: Math.round(net * 100) / 100, items: Math.round(items), discounts: Math.round(discounts * 100) / 100 };
}

// Date range: last 14 days
const today = new Date('2026-03-09');
const dates = [];
for (let i = 13; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  dates.push(d.toISOString().split('T')[0]);
}

// --- Chiswick daily breakdown ---
console.log('=== CHISWICK (blId: ' + LOCATIONS.chiswick + ') — Daily Sales ===\n');
console.log('Date           | Orders | Items | Gross (GBP) | Discounts | Notes');
console.log('---------------|--------|-------|-------------|-----------|------');

let chiswickTotal = { orders: 0, gross: 0, items: 0, discounts: 0 };
for (const date of dates) {
  try {
    const data = await getDailySalesV2(LOCATIONS.chiswick, date);
    const s = summariseDay(data);
    const complete = data.dataComplete ? '' : ' (incomplete)';
    console.log(`${date}      | ${String(s.orders).padStart(6)} | ${String(s.items).padStart(5)} | £${s.gross.toFixed(2).padStart(10)} | £${s.discounts.toFixed(2).padStart(8)} | ${complete}`);
    chiswickTotal.orders += s.orders;
    chiswickTotal.gross += s.gross;
    chiswickTotal.items += s.items;
    chiswickTotal.discounts += s.discounts;
  } catch (err) {
    console.log(`${date}      | ERROR: ${err.message.substring(0, 60)}`);
  }
}
console.log('---------------|--------|-------|-------------|-----------|------');
console.log(`TOTAL          | ${String(chiswickTotal.orders).padStart(6)} | ${String(chiswickTotal.items).padStart(5)} | £${chiswickTotal.gross.toFixed(2).padStart(10)} | £${chiswickTotal.discounts.toFixed(2).padStart(8)} |`);

// --- Item breakdown for Chiswick ---
console.log('\n\n=== CHISWICK — Top Selling Items (all days) ===\n');
const itemMap = {};
for (const date of dates) {
  try {
    const data = await getDailySalesV2(LOCATIONS.chiswick, date);
    for (const sale of data.sales || []) {
      for (const line of sale.salesLines || []) {
        if (line.parentLineId) continue;
        const key = line.name || line.sku;
        if (!itemMap[key]) itemMap[key] = { qty: 0, revenue: 0 };
        itemMap[key].qty += parseFloat(line.quantity) || 0;
        itemMap[key].revenue += parseFloat(line.totalNetAmountWithTax) || 0;
      }
    }
  } catch (_) {}
}
const sorted = Object.entries(itemMap).sort((a, b) => b[1].revenue - a[1].revenue);
console.log('Item                          | Qty | Revenue');
console.log('------------------------------|-----|--------');
for (const [name, data] of sorted) {
  console.log(`${name.padEnd(30)}| ${String(Math.round(data.qty)).padStart(3)} | £${data.revenue.toFixed(2)}`);
}

// --- All locations comparison (last 7 days) ---
console.log('\n\n=== ALL LOCATIONS — Last 7 Days Gross Revenue Comparison ===\n');
const locNames = Object.keys(LOCATIONS);
const compDates = dates.slice(-7);

// Header
console.log('Date           | ' + locNames.map(n => n.padStart(12)).join(' | '));
console.log('---------------|' + locNames.map(() => '-------------|').join(''));

const locTotals = {};
locNames.forEach(n => locTotals[n] = 0);

for (const date of compDates) {
  const row = [date + '      '];
  for (const loc of locNames) {
    try {
      const data = await getDailySalesV2(LOCATIONS[loc], date);
      const s = summariseDay(data);
      row.push(`£${s.gross.toFixed(2).padStart(10)}`);
      locTotals[loc] += s.gross;
    } catch (err) {
      row.push('     ERROR   ');
    }
  }
  console.log(row.join(' | '));
}
console.log('---------------|' + locNames.map(() => '-------------|').join(''));
console.log('TOTAL          | ' + locNames.map(n => `£${locTotals[n].toFixed(2).padStart(10)}`).join(' | '));
