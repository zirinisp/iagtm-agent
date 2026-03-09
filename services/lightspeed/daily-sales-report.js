import { apiRequest } from './lightspeed-client.js';

const LOCATIONS = {
  'Paddington':  243172458364930,
  'Shoreditch':  243172458369136,
  'Brent':       243172458370531,
  'Wandsworth':  243172458373688,
  'Peckham':     243172458378103,
  'Chiswick':    243172458383746,
};

function dayRange(daysAgo) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    label: start.toISOString().split('T')[0],
    from: encodeURIComponent(start.toISOString()),
    to: encodeURIComponent(end.toISOString()),
  };
}

async function fetchDaySalesBySource(blId, from, to) {
  try {
    const data = await apiRequest(
      `/finance/${blId}/aggregatedSales?from=${from}&to=${to}&groupBy=staff`
    );
    const sources = {};
    const staffChildren = data.children?.[0]?.children || [];
    for (const child of staffChildren) {
      const name = child.groupByValue;
      // Classify source
      let source;
      if (/uber/i.test(name)) source = 'Uber Eats';
      else if (/deliveroo/i.test(name)) source = 'Deliveroo';
      else if (/just.?eat/i.test(name)) source = 'Just Eat';
      else if (/feedr/i.test(name)) source = 'Feedr';
      else if (/deliverect/i.test(name)) source = 'Deliverect';
      else source = 'In-house';

      if (!sources[source]) sources[source] = { revenue: 0, sales: 0 };
      sources[source].revenue += parseFloat(child.totalAmount || '0');
      sources[source].sales += child.numberOfSales || 0;
    }
    return {
      totalRevenue: parseFloat(data.totalAmount || '0'),
      totalSales: data.numberOfSales || 0,
      sources,
    };
  } catch {
    return { totalRevenue: 0, totalSales: 0, sources: {} };
  }
}

async function main() {
  const days = 7;
  const allData = [];

  for (let d = days; d >= 1; d--) {
    const { label, from, to } = dayRange(d);
    const dayData = { date: label, locations: {} };

    // Fetch all locations in parallel for this day
    const entries = Object.entries(LOCATIONS);
    const results = await Promise.all(
      entries.map(([name, blId]) => fetchDaySalesBySource(blId, from, to))
    );

    for (let i = 0; i < entries.length; i++) {
      dayData.locations[entries[i][0]] = results[i];
    }
    allData.push(dayData);
  }

  // Print daily summary table
  console.log('\n=== DAILY SALES BY LOCATION (Last 7 Days) ===\n');
  const locNames = Object.keys(LOCATIONS);
  const header = ['Date', ...locNames, 'TOTAL'].map(s => s.padStart(12)).join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const day of allData) {
    let dayTotal = 0;
    const vals = locNames.map(loc => {
      const rev = day.locations[loc]?.totalRevenue || 0;
      dayTotal += rev;
      return `£${rev.toFixed(0)}`.padStart(12);
    });
    console.log([day.date.padStart(12), ...vals, `£${dayTotal.toFixed(0)}`.padStart(12)].join(''));
  }

  // Totals row
  const totals = locNames.map(loc => {
    const sum = allData.reduce((acc, day) => acc + (day.locations[loc]?.totalRevenue || 0), 0);
    return `£${sum.toFixed(0)}`.padStart(12);
  });
  const grandTotal = allData.reduce((acc, day) => {
    return acc + locNames.reduce((a, loc) => a + (day.locations[loc]?.totalRevenue || 0), 0);
  }, 0);
  console.log('-'.repeat(header.length));
  console.log(['       TOTAL', ...totals, `£${grandTotal.toFixed(0)}`.padStart(12)].join(''));

  // Print source breakdown
  console.log('\n\n=== REVENUE BY SOURCE (Last 7 Days) ===\n');

  // Aggregate sources across all days and locations
  const sourcesByLocation = {};
  const allSources = new Set();

  for (const loc of locNames) {
    sourcesByLocation[loc] = {};
    for (const day of allData) {
      const daySources = day.locations[loc]?.sources || {};
      for (const [src, data] of Object.entries(daySources)) {
        allSources.add(src);
        if (!sourcesByLocation[loc][src]) sourcesByLocation[loc][src] = { revenue: 0, sales: 0 };
        sourcesByLocation[loc][src].revenue += data.revenue;
        sourcesByLocation[loc][src].sales += data.sales;
      }
    }
  }

  const sourceList = [...allSources].sort();
  const srcHeader = ['Location', ...sourceList.map(s => s.padStart(14)), '     TOTAL'].join('');
  console.log(srcHeader);
  console.log('-'.repeat(srcHeader.length));

  for (const loc of locNames) {
    const vals = sourceList.map(src => {
      const rev = sourcesByLocation[loc][src]?.revenue || 0;
      return `£${rev.toFixed(0)}`.padStart(14);
    });
    const locTotal = Object.values(sourcesByLocation[loc]).reduce((a, v) => a + v.revenue, 0);
    console.log([loc.padEnd(12), ...vals, `£${locTotal.toFixed(0)}`.padStart(10)].join(''));
  }

  // Source totals
  console.log('-'.repeat(srcHeader.length));
  const srcTotals = sourceList.map(src => {
    const sum = locNames.reduce((a, loc) => a + (sourcesByLocation[loc][src]?.revenue || 0), 0);
    return `£${sum.toFixed(0)}`.padStart(14);
  });
  console.log(['TOTAL       ', ...srcTotals, `£${grandTotal.toFixed(0)}`.padStart(10)].join(''));

  // Daily source breakdown
  console.log('\n\n=== DAILY SOURCE BREAKDOWN ===\n');
  const dailySrcHeader = ['Date', ...sourceList.map(s => s.padStart(14)), '     TOTAL'].join('');
  console.log(dailySrcHeader);
  console.log('-'.repeat(dailySrcHeader.length));

  for (const day of allData) {
    const daySrcTotals = {};
    let dayTotal = 0;
    for (const loc of locNames) {
      const daySources = day.locations[loc]?.sources || {};
      for (const [src, data] of Object.entries(daySources)) {
        if (!daySrcTotals[src]) daySrcTotals[src] = 0;
        daySrcTotals[src] += data.revenue;
        dayTotal += data.revenue;
      }
    }
    const vals = sourceList.map(src => `£${(daySrcTotals[src] || 0).toFixed(0)}`.padStart(14));
    console.log([day.date.padStart(12), ...vals, `£${dayTotal.toFixed(0)}`.padStart(10)].join(''));
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
