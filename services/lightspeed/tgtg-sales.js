/**
 * TooGoodToGo (TGTG) Sales Analysis for IAGTM
 * 
 * Dynamically discovers TGTG products and payment method from Lightspeed,
 * then pulls sales data for a given period.
 * 
 * Usage:
 *   As module:  import { getTgtgSales, getTgtgProducts, getTgtgSummary } from './tgtg-sales.js'
 *   As CLI:     node tgtg-sales.js [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--location name]
 * 
 * The TGTG payment method code is GOTOGO. Products use K-TGTG-* SKU prefix.
 * Both are discovered dynamically from the API — no hardcoded product list.
 */
import 'dotenv/config';
import { LOCATIONS, getPaymentMethods, getAllFinancials } from './lightspeed-client.js';

const TGTG_PAYMENT_CODE = 'GOTOGO';
const TGTG_SKU_PREFIX = 'K-TGTG-';

/**
 * Discover TGTG payment method for a location.
 * Returns the payment method object or null if not found.
 */
export async function getTgtgPaymentMethod(blId) {
  const pm = await getPaymentMethods(blId);
  const list = pm?._embedded?.paymentMethodList || [];
  return list.find(m => m.code === TGTG_PAYMENT_CODE) || null;
}

/**
 * Discover all TGTG products sold at a location in a given period.
 * Scans actual sales data to find products with K-TGTG-* SKUs.
 * Returns a Map of SKU -> { name, sku, count, revenue, accountingGroup, tier, parentSku }.
 *
 * Products follow a 3-tier hierarchy in Marketman:
 *   Tier 1 (bags): Sellable items with retail prices (K-TGTG-PIES, K-TGTG-GRILL, etc.)
 *   Tier 2 (selectors): Choice/modifier groups (K-TGTG-CH, K-TGTG-CHOICES, etc.)
 *   Tier 3 (food items): Individual dishes with Marketman recipes (K-TGTG-SALAD-GR, K-TGTG-PIE-CH, etc.)
 *
 * Tier 3 items link to their regular menu counterparts in Marketman, so you can
 * trace TGTG sales back to actual ingredient usage and food cost.
 */
export async function getTgtgProducts(blId, from, to) {
  const sales = await getAllFinancials(blId, from, to, { include: 'payments' });
  const tgtgReceipts = sales.filter(s =>
    s.payments?.some(p => p.code === TGTG_PAYMENT_CODE)
  );

  const products = new Map();
  for (const sale of tgtgReceipts) {
    const lines = sale.salesLines || [];
    // Build parent SKU lookup for linking modifiers to their bag
    const parentSkuMap = {};
    for (const line of lines) {
      if (!line.parentLineId) {
        parentSkuMap[line.id] = line.sku || '';
      }
    }

    for (const line of lines) {
      const sku = line.sku || '';
      if (!sku.startsWith(TGTG_SKU_PREFIX)) continue;

      const isModifier = !!line.parentLineId;
      const parentSku = isModifier ? (parentSkuMap[line.parentLineId] || '') : null;

      const existing = products.get(sku) || {
        name: line.name,
        sku,
        count: 0,
        revenue: 0,
        accountingGroup: line.accountingGroup?.name || 'Unknown',
        tier: isModifier ? 'modifier' : 'bag',
        parentSku,
      };
      existing.count += parseFloat(line.quantity || 1);
      existing.revenue += parseFloat(line.totalNetAmountWithTax || 0);
      products.set(sku, existing);
    }
  }
  return products;
}

/**
 * Get all TGTG sales for a location in a period.
 * Returns { receipts, revenue, avgPerReceipt, items, dailyCounts, hourlyCounts, dayOfWeekCounts, rawReceipts }.
 */
export async function getTgtgSales(blId, from, to) {
  const isoFrom = from.includes('T') ? from : `${from}T00:00:00+00:00`;
  const isoTo = to.includes('T') ? to : `${to}T23:59:59+00:00`;

  const sales = await getAllFinancials(blId, isoFrom, isoTo, { include: 'payments' });
  const tgtgSales = sales.filter(s =>
    s.payments?.some(p => p.code === TGTG_PAYMENT_CODE)
  );

  if (!tgtgSales.length) {
    return {
      receipts: 0, revenue: 0, avgPerReceipt: 0,
      items: [], dailyCounts: {}, hourlyCounts: {}, dayOfWeekCounts: {},
      totalReceipts: sales.length, rawReceipts: [],
    };
  }

  let totalRevenue = 0;
  const items = {};
  const dailyCounts = {};
  const hourlyCounts = {};
  const dayOfWeekCounts = {};

  for (const sale of tgtgSales) {
    // Revenue from GOTOGO payments only
    const saleRev = (sale.payments || [])
      .filter(p => p.code === TGTG_PAYMENT_CODE)
      .reduce((sum, p) => sum + parseFloat(p.netAmountWithTax || 0), 0);
    totalRevenue += saleRev;

    // Time analysis
    const closeTime = sale.timeOfCloseAndPaid || sale.timeOfOpening || '';
    const date = closeTime.substring(0, 10);
    const hour = closeTime.substring(11, 13);
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    if (hour) hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;

    const dow = new Date(closeTime).toLocaleDateString('en-US', { weekday: 'long' });
    if (dow !== 'Invalid Date') dayOfWeekCounts[dow] = (dayOfWeekCounts[dow] || 0) + 1;

    // Items — bag-level (no parentLineId) and modifier-level (with parentLineId)
    const lines = sale.salesLines || [];
    for (const line of lines) {
      const name = line.name || line.sku || 'unknown';
      const sku = line.sku || '';
      const qty = parseFloat(line.quantity || 1);
      const rev = parseFloat(line.totalNetAmountWithTax || 0);
      const isModifier = !!line.parentLineId;

      if (!items[sku || name]) {
        items[sku || name] = {
          name, sku, count: 0, revenue: 0,
          isTgtgProduct: sku.startsWith(TGTG_SKU_PREFIX),
          tier: isModifier ? 'modifier' : 'bag',
        };
      }
      items[sku || name].count += qty;
      items[sku || name].revenue += rev;
    }
  }

  const sortedItems = Object.values(items).sort((a, b) => b.count - a.count);

  return {
    receipts: tgtgSales.length,
    revenue: totalRevenue,
    avgPerReceipt: totalRevenue / tgtgSales.length,
    pctOfTotal: (tgtgSales.length / sales.length) * 100,
    totalReceipts: sales.length,
    items: sortedItems,
    dailyCounts,
    hourlyCounts,
    dayOfWeekCounts,
    rawReceipts: tgtgSales,
  };
}

/**
 * Get a summary across all (or specified) locations.
 * Returns { locations: { [name]: result }, totals: { receipts, revenue, ... } }.
 */
export async function getTgtgSummary(from, to, locationFilter = null) {
  const locations = locationFilter
    ? Object.fromEntries(Object.entries(LOCATIONS).filter(([k]) => locationFilter.includes(k)))
    : LOCATIONS;

  const results = {};
  let totalReceipts = 0, totalRevenue = 0, totalAllReceipts = 0;

  for (const [name, blId] of Object.entries(locations)) {
    const data = await getTgtgSales(blId, from, to);
    results[name] = data;
    totalReceipts += data.receipts;
    totalRevenue += data.revenue;
    totalAllReceipts += data.totalReceipts;
  }

  return {
    locations: results,
    totals: {
      receipts: totalReceipts,
      revenue: totalRevenue,
      avgPerReceipt: totalReceipts > 0 ? totalRevenue / totalReceipts : 0,
      pctOfTotal: totalAllReceipts > 0 ? (totalReceipts / totalAllReceipts) * 100 : 0,
      totalReceipts: totalAllReceipts,
    },
    period: { from, to },
  };
}

// --- CLI mode ---
const isMain = process.argv[1]?.endsWith('tgtg-sales.js');
if (isMain) {
  const args = process.argv.slice(2);
  const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const from = getArg('--from') || thirtyDaysAgo.toISOString().substring(0, 10);
  const to = getArg('--to') || now.toISOString().substring(0, 10);
  const loc = getArg('--location');

  console.log(`TGTG Sales: ${from} to ${to}${loc ? ` (${loc} only)` : ' (all locations)'}\n`);

  try {
    if (loc) {
      const blId = LOCATIONS[loc.toLowerCase()];
      if (!blId) { console.error(`Unknown location: ${loc}. Options: ${Object.keys(LOCATIONS).join(', ')}`); process.exit(1); }

      // Show payment method
      const pm = await getTgtgPaymentMethod(blId);
      console.log(`Payment method: ${pm ? `${pm.name} (${pm.code}, pmId: ${pm.pmId})` : 'NOT FOUND'}\n`);

      // Show sales
      const data = await getTgtgSales(blId, from, to);
      console.log(`Receipts: ${data.receipts} of ${data.totalReceipts} (${data.pctOfTotal.toFixed(2)}%)`);
      console.log(`Revenue: £${data.revenue.toFixed(2)}`);
      console.log(`Avg/receipt: £${data.avgPerReceipt.toFixed(2)}\n`);

      if (data.items.length) {
        const bags = data.items.filter(i => i.tier === 'bag');
        const modifiers = data.items.filter(i => i.tier === 'modifier');

        console.log('Bag-level items (Tier 1):');
        bags.forEach(i => {
          const tag = i.isTgtgProduct ? ' [TGTG]' : '';
          console.log(`  ${i.name} (${i.sku}): ${i.count}x £${i.revenue.toFixed(2)}${tag}`);
        });

        if (modifiers.length) {
          console.log('\nContents/modifiers (Tier 3 — linked to Marketman recipes):');
          modifiers.filter(i => i.isTgtgProduct).forEach(i => {
            console.log(`  ${i.name} (${i.sku}): ${i.count}x`);
          });
          const nonTgtgMods = modifiers.filter(i => !i.isTgtgProduct);
          if (nonTgtgMods.length) {
            console.log('\nRegular menu items sold via TGTG:');
            nonTgtgMods.forEach(i => {
              console.log(`  ${i.name} (${i.sku}): ${i.count}x`);
            });
          }
        }
      }
    } else {
      const summary = await getTgtgSummary(from, to);
      console.log('Location Summary:\n');
      for (const [name, data] of Object.entries(summary.locations)) {
        const status = data.receipts === 0 ? 'INACTIVE' : `${data.receipts} receipts, £${data.revenue.toFixed(2)}`;
        console.log(`  ${name}: ${status}`);
        if (data.items.length) {
          const tgtgItems = data.items.filter(i => i.isTgtgProduct);
          console.log(`    TGTG products: ${tgtgItems.map(i => `${i.name} (${i.count}x)`).join(', ') || 'none'}`);
        }
      }
      console.log(`\n  TOTAL: ${summary.totals.receipts} receipts, £${summary.totals.revenue.toFixed(2)} (${summary.totals.pctOfTotal.toFixed(2)}% of all)`);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
