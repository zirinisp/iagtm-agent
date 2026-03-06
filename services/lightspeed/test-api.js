import { apiRequest, getAccessToken } from './lightspeed-client.js';

async function main() {
  try {
    // Verify we have a valid token
    console.log('Checking access token...');
    const token = await getAccessToken();
    console.log('Token OK:', token.substring(0, 20) + '...\n');

    // Get all businesses and locations
    console.log('Fetching businesses...');
    const businesses = await apiRequest('/data/businesses');
    console.log(JSON.stringify(businesses, null, 2));

    // If we have business locations, fetch some data from the first one
    const locations = businesses?._embedded?.businessList?.flatMap(b => b.businessLocations) || [];
    if (locations.length > 0) {
      console.log(`\nFound ${locations.length} location(s):`);
      for (const loc of locations) {
        console.log(`  - ${loc.blName} (blId: ${loc.blId})`);
      }

      // Fetch payment methods for the first location
      const blId = locations[0].blId;
      console.log(`\nFetching payment methods for ${locations[0].blName}...`);
      const paymentMethods = await apiRequest(`/finance/${blId}/paymentMethods`);
      console.log(JSON.stringify(paymentMethods, null, 2));

      // Fetch today's financials (last 1 day)
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const from = encodeURIComponent(yesterday.toISOString());
      const to = encodeURIComponent(today.toISOString());

      console.log(`\nFetching financials for ${locations[0].blName} (last 24h)...`);
      const financials = await apiRequest(`/finance/${blId}/financials/${from}/${to}?include=staff,payments`);
      console.log(JSON.stringify(financials, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
