import { apiRequest, getAccessToken } from './lightspeed-client.js';

const LOCATIONS = {
  'Paddington':  243172458364930,
  'Shoreditch':  243172458369136,
  'Brent':       243172458370531,
  'Wandsworth':  243172458373688,
  'Peckham':     243172458378103,
  'Chiswick':    243172458383746,
};

async function testEndpoint(name, fn) {
  try {
    const result = await fn();
    console.log(`\n=== ${name} ===`);
    const json = JSON.stringify(result, null, 2);
    // Truncate large responses for readability
    if (json.length > 2000) {
      console.log(json.substring(0, 2000) + `\n... (${json.length} chars total)`);
    } else {
      console.log(json);
    }
    return { name, status: 'OK', data: result };
  } catch (err) {
    console.log(`\n=== ${name} === FAILED`);
    console.log(err.message);
    return { name, status: 'FAILED', error: err.message };
  }
}

async function main() {
  const token = await getAccessToken();
  console.log('Token OK\n');

  const blId = LOCATIONS['Paddington'];
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const from = encodeURIComponent(yesterday.toISOString());
  const to = encodeURIComponent(now.toISOString());

  const results = [];

  // 1. Businesses
  results.push(await testEndpoint('GET /data/businesses', () =>
    apiRequest('/data/businesses')
  ));

  // 2. Tax Rates
  results.push(await testEndpoint('GET /finance/{blId}/tax-rates', () =>
    apiRequest(`/finance/${blId}/tax-rates`)
  ));

  // 3. Payment Methods
  results.push(await testEndpoint('GET /finance/{blId}/paymentMethods', () =>
    apiRequest(`/finance/${blId}/paymentMethods`)
  ));

  // 4. Accounting Groups
  results.push(await testEndpoint('GET /finance/{blId}/accountingGroups', () =>
    apiRequest(`/finance/${blId}/accountingGroups`)
  ));

  // 5. Financials (V1)
  results.push(await testEndpoint('GET /finance/{blId}/financials/{from}/{to}', () =>
    apiRequest(`/finance/${blId}/financials/${from}/${to}?include=staff,table,payments,consumer,revenue_center&pageSize=5`)
  ));

  // 6. Daily Financials (uses date param, not path)
  const yesterdayDate = yesterday.toISOString().split('T')[0];
  results.push(await testEndpoint('GET /finance/{blId}/daily-financials', () =>
    apiRequest(`/finance/${blId}/daily-financials?date=${yesterdayDate}&include=staff,payments`)
  ));

  // 7. Aggregated Sales — by staff
  results.push(await testEndpoint('GET /finance/{blId}/aggregatedSales?groupBy=staff', () =>
    apiRequest(`/finance/${blId}/aggregatedSales?from=${from}&to=${to}&groupBy=staff`)
  ));

  // 8. Aggregated Sales — by accountingGroup
  results.push(await testEndpoint('GET /finance/{blId}/aggregatedSales?groupBy=accountingGroup', () =>
    apiRequest(`/finance/${blId}/aggregatedSales?from=${from}&to=${to}&groupBy=accountingGroup`)
  ));

  // 9. Aggregated Sales — by device
  results.push(await testEndpoint('GET /finance/{blId}/aggregatedSales?groupBy=device', () =>
    apiRequest(`/finance/${blId}/aggregatedSales?from=${from}&to=${to}&groupBy=device`)
  ));

  // 10. V2 Sales endpoint
  results.push(await testEndpoint('GET /v2/business-location/{blId}/sales', () =>
    apiRequest(`/v2/business-location/${blId}/sales?from=${from}&to=${to}&pageSize=5`)
  ));

  // 11. V2 Business Day Sales
  results.push(await testEndpoint('GET /v2/business-location/{blId}/sales-daily', () =>
    apiRequest(`/v2/business-location/${blId}/sales-daily?date=${yesterdayDate}`)
  ));

  // 12. Test all locations — quick revenue check via aggregated sales
  console.log('\n\n========== MULTI-LOCATION TEST ==========');
  for (const [name, id] of Object.entries(LOCATIONS)) {
    results.push(await testEndpoint(`Aggregated sales: ${name}`, () =>
      apiRequest(`/finance/${id}/aggregatedSales?from=${from}&to=${to}&groupBy=accountingGroup`)
    ));
  }

  // Summary
  console.log('\n\n========== ENDPOINT TEST SUMMARY ==========');
  for (const r of results) {
    console.log(`${r.status === 'OK' ? '✅' : '❌'} ${r.name}: ${r.status}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
