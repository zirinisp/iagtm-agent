#!/usr/bin/env node

/**
 * Deputy API Connection Test
 *
 * Tests the Deputy API token and lists all IAGTM locations and areas.
 * Run: node services/deputy/test-connection.js
 */

import { getMe, getLocations, getAreas } from './deputy-client.js';

async function main() {
  console.log('=== Deputy API Connection Test ===\n');

  // 1. Validate token
  console.log('1. Testing token with /me...');
  try {
    const me = await getMe();
    console.log(`   Token valid. Logged in as: ${me.DisplayName || me.FirstName + ' ' + me.LastName}`);
    console.log(`   User ID: ${me.Id}`);
    console.log(`   Email: ${me.Email || 'N/A'}`);
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
    console.error('\n   Make sure DEPUTY_TOKEN is set correctly in services/deputy/.env');
    console.error('   Generate a token at: https://c4cae802074915.uk.deputy.com/exec/devapp/oauth_clients');
    process.exit(1);
  }

  // 2. List locations
  console.log('\n2. Fetching locations (Company)...');
  try {
    const locations = await getLocations();
    console.log(`   Found ${locations.length} location(s):\n`);
    console.log('   ID  | Active | Name');
    console.log('   ----|--------|' + '-'.repeat(40));
    for (const loc of locations) {
      const active = loc.Active ? 'Yes' : 'No';
      console.log(`   ${String(loc.Id).padEnd(3)} | ${active.padEnd(6)} | ${loc.CompanyName || loc.TradingName || 'Unnamed'}`);
    }
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
  }

  // 3. List areas
  console.log('\n3. Fetching areas (OperationalUnit)...');
  try {
    const areas = await getAreas();
    console.log(`   Found ${areas.length} area(s):\n`);
    console.log('   ID  | Location ID | Active | Name');
    console.log('   ----|-------------|--------|' + '-'.repeat(30));
    for (const area of areas) {
      const active = area.Active ? 'Yes' : 'No';
      console.log(`   ${String(area.Id).padEnd(3)} | ${String(area.Company).padEnd(11)} | ${active.padEnd(6)} | ${area.OperationalUnitName || 'Unnamed'}`);
    }
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
  }

  console.log('\n=== Test Complete ===');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
