import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadTokens, getOrganisation, getTrackingCategories } from './xero-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dirname, 'tokens.json');

async function main() {
  console.log('=== Xero Connection Test (Auth Code Flow) ===\n');

  // Check tokens.json exists
  if (!existsSync(TOKEN_FILE)) {
    console.error('tokens.json not found.');
    console.error('Run "node services/xero/xero-auth.js" first to authorize the app.\n');
    process.exit(1);
  }

  try {
    // 1. Load and display token info
    console.log('1. Loading tokens...');
    const tokens = await loadTokens();
    console.log(`   Tenant ID: ${tokens.tenant_id}`);
    console.log(`   Token obtained: ${tokens.obtained_at}`);
    console.log(`   Token expires:  ${tokens.expires_at}`);

    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const minutesLeft = Math.round((expiresAt - now) / 60000);
    if (minutesLeft > 0) {
      console.log(`   Time remaining: ${minutesLeft} minutes`);
    } else {
      console.log(`   Token expired ${Math.abs(minutesLeft)} minutes ago (will auto-refresh)`);
    }

    console.log('');

    // 2. Organisation details
    console.log('2. Fetching organisation...');
    const orgResult = await getOrganisation();
    const org = orgResult.Organisations?.[0];
    if (org) {
      console.log(`   Name: ${org.Name}`);
      console.log(`   Legal Name: ${org.LegalName}`);
      console.log(`   Short Code: ${org.ShortCode}`);
      console.log(`   Country: ${org.CountryCode}`);
      console.log(`   Base Currency: ${org.BaseCurrency}`);
      console.log(`   Financial Year End: Month ${org.FinancialYearEndMonth}, Day ${org.FinancialYearEndDay}`);
      console.log(`   Organisation Type: ${org.OrganisationType}`);
    } else {
      console.log('   No organisation data returned.');
    }

    console.log('');

    // 3. Tracking categories (location tracking)
    console.log('3. Fetching tracking categories...');
    const catResult = await getTrackingCategories();
    const categories = catResult.TrackingCategories || [];
    if (categories.length === 0) {
      console.log('   No tracking categories found.');
    } else {
      for (const cat of categories) {
        console.log(`   Category: ${cat.Name} (${cat.TrackingCategoryID})`);
        console.log(`   Status: ${cat.Status}`);
        if (cat.Options?.length) {
          for (const opt of cat.Options) {
            console.log(`     - ${opt.Name} (${opt.Status})`);
          }
        }
      }
    }

    console.log('\n=== Connection test passed ===');
  } catch (err) {
    console.error('\nConnection test FAILED:', err.message);
    if (err.message.includes('refresh')) {
      console.error('\nThe refresh token may have expired. Re-run: node services/xero/xero-auth.js');
    }
    process.exit(1);
  }
}

main();
