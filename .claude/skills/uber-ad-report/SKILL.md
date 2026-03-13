---
name: uber-ad-report
description: Show all currently running Uber Eats ads, offers, and their performance for IAGTM. Use when the user asks about running ads, active campaigns, offer status, ad performance, ROAS summary, or marketing overview.
argument-hint: "[optional: location name or 'all']"
---

Show all currently running IAGTM Uber Eats ads and offers — campaigns, Ads Manager offers, and UEM offers — with performance data and budget status.

## Steps

### 1. Ads Manager — Active Campaigns
Navigate to: https://advertiser.uber.com/campaigns/manage
- Wait for page to load, dismiss any feedback popup
- Note the date range shown (default: last 14 days)
- Read the summary totals: Total ad spend, Sales, ROAS, CTR
- Paginate through ALL pages of campaigns (check "X of Y" pagination)
- For each ACTIVE campaign, capture: Campaign name, Location(s), Budget/wk or /day, End date (if any), Budget pacing %, ROAS, Sales, Ad spend, CTR, Conversion rate
- Note any campaigns with 0% pacing or 0% ROAS — flag these
- Note campaigns that are Scheduled (not yet live) or Off/Completed

**Budget remaining for campaigns with end dates:**
- Total campaign budget = (budget/wk × weeks remaining) or (budget/day × days remaining)
- Spent = Ad spend column (for the full campaign period, not just the date range shown)
- Remaining = Total - Spent
- For ongoing weekly campaigns with no end date: state "Weekly budget: £X (no total cap)"

### 2. Ads Manager — Offers Tab
Navigate to: https://advertiser.uber.com/campaigns/manage/offers
- Wait for page to load
- Note the summary totals: Orders, Offer redeemed amount, Sales, Avg basket size
- For each ACTIVE offer, capture: Offer name, Location, Audience, Offer type, Start/End date, Details (discount %, min spend), Sales, Offer redeemed amount, Orders, New customers
- Note any Revoked offers (these are replaced duplicates — skip them)

### 3. UEM Offers — Per Location
Navigate to: https://merchants.ubereats.com/manager/marketing/redirect?restaurantUUID=d9709678-6e20-489f-99f4-671eda2e3197
- Wait for redirect to the campaigns page
- Set rows per page to 500 (click the rows-per-page dropdown)
- **IMPORTANT: The all-shops view does NOT show shop names.** Use the shop filter to check each location individually:
  1. Click "All shops (6)" filter button
  2. Deselect all, select ONE location
  3. Record all ACTIVE offers for that location
  4. Repeat for all 6 locations

**Location UUIDs for direct navigation:**
| Location | UUID |
|----------|------|
| Paddington | d9709678-6e20-489f-99f4-671eda2e3197 |
| Shoreditch | 7dfe1d28-66cd-53b2-a20c-7e543c70b45a |
| Brent Cross | dfcc4b42-c1b0-5ed1-97f2-76002765caa5 |
| Wandsworth | 479896b1-96f2-59a0-bb6e-3404cfb11357 |
| Peckham | a51efcfd-8ea6-50ab-93fd-7bf5cfed3cc0 |
| Chiswick | cd7158e7-0067-5e65-8181-00b0e445a2b5 |

For each ACTIVE offer per location, capture: Offer type/name, Audience, Dates, Sales, Orders, New customers, Uber funding % (if shown)

Also note any COMPLETED offers from this month — they ran and ended (e.g. BOGO replaced by 25% off).

### 4. Present Results

Output in this format:

---
## IAGTM Uber Eats — Active Ads & Offers
*Date range: [date range from Ads Manager]*

### Ads Manager — Campaign Summary
**Total: £[spend] spent | £[sales] sales | [ROAS]% ROAS | [CTR]% CTR**

#### Location Campaigns (Sponsored Listings)
| Location | Budget | ROAS | Sales | Spend | Pacing | Budget Remaining |
|----------|--------|------|-------|-------|--------|-----------------|
| ... |

#### Cross-Location Campaigns
| Campaign | Budget | ROAS | Sales | Spend | Pacing | Notes |
|----------|--------|------|-------|-------|--------|-------|
| ... |

⚠️ Flags: [List any campaigns with 0% pacing, 0 ROAS, or underperforming]

---
### Ads Manager Offers (Chiswick test)
| Offer | Audience | Type | Sales | Redeemed | Orders | New Cust | Ends |
| ... |

---
### UEM Offers — By Location

#### Paddington
| Offer | Audience | Dates | Sales | Orders | New Cust | Funding |
| ... |

#### Shoreditch
...etc for all 6 locations

**Cross-location offers:**
| Offer | Audience | Locations | Sales | Orders | New Cust |
| ... |

---
### Summary Totals
- Total ad spend (campaigns): £X
- Total offer-influenced sales (UEM): £X
- Total new customers from offers: X
- Campaigns ending this month: [list]
