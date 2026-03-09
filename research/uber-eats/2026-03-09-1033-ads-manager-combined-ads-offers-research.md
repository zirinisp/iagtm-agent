# Uber Ads Manager: Combined Ads + Offers Research

**Date**: 9 March 2026
**Author**: Claude Code Agent
**Purpose**: Investigate Uber Ads Manager's integrated ads+offers feature and identify upgrade opportunities for IAGTM

---

## Executive Summary

IAGTM currently runs advertising (Sponsored Listings, Keyword Targeting) in **Uber Ads Manager** and promotional offers (BOGO, discounts, etc.) in **Uber Eats Manager** — two separate platforms that do not sync. Since May 2025, Uber has been building integrated ads+offers capability directly inside Ads Manager. As of February 2026, this is fully available but IAGTM has never used it. The Ads Manager offers section shows **0 campaigns**.

Moving to unified ads+offers campaigns would give IAGTM better targeting, unified reporting, self-serve control, and compounding visibility+incentive effects.

---

## 1. Current State: How IAGTM Operates

### Two Disconnected Platforms

| What | Where | Who Manages |
|------|-------|-------------|
| Paid ads (Sponsored Listings, Keywords) | **Ads Manager** (advertiser.uber.com) | IAGTM / agent |
| Promotional offers (BOGO, discounts, etc.) | **Uber Eats Manager** (merchants.ubereats.com) | Uber Account Manager |
| Ads Manager → Offers section | **Empty** (0 campaigns) | Nobody |

### Current Ad Spend

- **Total active weekly spend**: ~£1,800/week (~£7,200/month)
  - 5 Location campaigns (Sponsored Listing): £500/wk
  - 4 Keyword campaigns: £700/wk
  - Uber One campaign: £400/wk
  - New To Brand campaign: £200/wk

### Current Offer Strategy

Offers are managed by the Uber Account Manager in Uber Eats Manager:
- **Tier A**: BOGO Wraps (Uber co-funded) for new customer acquisition
- **Tier B**: 25% off for new customers (Paddington runs this from Day 1)
- **Basket Increase**: Free Side Salad / Fries for orders >£30
- **Win-Back**: £5 off min £25 for lapsed customers
- **Loyalty**: Free Soft Drink >£15 for Uber One members

### The Coordination Gap

The marketing strategy document maps ad audiences to offers conceptually:

| Ad Audience Segment | Paired Offer | Status |
|---------------------|-------------|--------|
| New to brand | BOGO or 25% Off | Logically paired, NOT technically integrated |
| New to location | Free Delivery | Logically paired, NOT technically integrated |
| Lapsed customers | £5 Off min £25 | Logically paired, NOT technically integrated |
| Existing customers | Free Side Salad >£30 | Logically paired, NOT technically integrated |
| Uber One members | Free Soft Drink >£15 | Logically paired, NOT technically integrated |

These pairings exist in strategy documentation only — there is no technical link between ad campaigns and offers.

---

## 2. What Uber Has Built (May 2025 – February 2026)

### Timeline of Updates

**May 2025 — Ads Manager Update**
- Self-serve offers creation and reporting added to Ads Manager
- Offers can now be managed alongside ads in one tool
- Initial offer types: Storewide discounts, Free delivery, BOGO, Spend More Save More

**May 2025 — Smarter Offers Features**
- Customer behavior targeting for offers (lapsed vs. returning)
- Improved offer customization and scheduling

**December 2025 — Simplified Ad Creation**
- Live preview functionality
- Recommended settings to reduce setup complexity
- Draft-saving capability

**February 2026 — Latest Update**
- New offer types added: Discount Items, Happy Hour, Buy 1 Get a Free Item
- Mix-and-match freebies (customers select from item groups)
- Auto-reminders for free item offers
- Brand-level customer targeting across multiple locations
- Uber-funded campaign opportunities (co-sponsored offers)
- Smart recommendations with projected sales impact
- Pause recovery prompts for high-performing campaigns

### All Offer Types Now Available in Ads Manager

| # | Offer Type | Description | New in Ads Manager? |
|---|-----------|-------------|-------------------|
| 1 | Buy 1, Get 1 Free | BOGO on same item | No (available since May 2025) |
| 2 | Buy 1, Get a Free Item | Free different item with purchase, mix-and-match | Yes (Feb 2026) |
| 3 | Free Item | Free item with any order, now with auto-reminders | Updated (Feb 2026) |
| 4 | Shop-wide Discount | Percentage off entire order | No (available since May 2025) |
| 5 | Spend More, Save More | Minimum spend threshold for savings | No (available since May 2025) |
| 6 | Free Delivery | Cover customer's delivery fee | No (available since May 2025) |
| 7 | Discount Items | Percentage off selected items | Yes (Feb 2026) |
| 8 | Happy Hour | Time-limited off-peak offers (14:00–17:00) | Yes (Feb 2026) |

### Key New Capabilities

| Feature | What It Does | Impact for IAGTM |
|---------|-------------|-----------------|
| **Unified ads + offers** | Create and manage both in one place | Stop splitting work across 2 platforms |
| **Customer behavior targeting for offers** | Target lapsed vs. returning customers at offer level | Currently only ads are targeted — offers are blanket |
| **Brand-level customer targeting** | Reach first-time customers across ALL 6 locations | Current offers are per-location only |
| **Uber-funded campaigns** | Co-sponsored offer opportunities from Uber | May unlock additional co-funding beyond current BOGO deal |
| **Smart recommendations** | AI suggests budget increases, keyword expansion, creative additions | See these for ads but not for offer+ad combos |
| **Draft campaigns** | Save and review before launching | Better for multi-location coordination |
| **Auto-reminders** | Customers get reminded about free item offers | Reduces redemption friction |
| **Pause recovery prompts** | Alerts to restart high-performing paused campaigns | Prevents missed revenue |
| **Offers API** | Nearly all offer types available via API | Could integrate with Deliverect/POS systems |

---

## 3. The Combined Campaign Concept

### How Ads + Offers Work Together

Uber's key insight: **"Running ads and offers together is a great way to boost your brand to the top of the feed, and attract customers with savings."**

The compounding effect:
1. **Ad** (Sponsored Listing / Keyword) → Gets you **visibility** (top of feed, search results)
2. **Offer** (BOGO, discount, etc.) → Gives the customer a **reason to convert**
3. **Combined** → Visibility × Incentive = Higher conversion than either alone

### Current Approach vs. Combined Approach

**Current (Separate)**:
```
Ads Manager:  [Sponsored Listing → Paddington → All Customers → £100/wk]
Eats Manager: [BOGO Chicken Wrap → Paddington → New Customers → £X/wk]
              ↑ No technical connection between these ↑
```

**Combined (Integrated)**:
```
Ads Manager:  [Campaign → Paddington → New To Brand audience]
              ├── Ad Group: Sponsored Listing (visibility)
              └── Offer: BOGO Chicken Wrap (conversion)
              → Unified budget, targeting, and reporting
```

### Performance Data Supporting the Shift

| Metric | Source |
|--------|--------|
| BOGO offers drive **up to 42% sales lift** | Uber data (May 2023 merchant experiment) |
| Restaurants running offers in first month: **94% lift in incremental sales** | Uber SMB data |
| Sponsored listings increase orders by **up to 15%** | Uber platform data |
| No service fee charged on the free item in BOGO offers | Uber UK policy |
| Post-checkout + Offer ads drive substantial repeat orders | Uber ad surfaces documentation |

---

## 4. Recommended Changes

### Immediate Wins (Low Effort, High Impact)

#### 1. Move Offer Creation into Ads Manager
Stop relying on the Account Manager to upload offers in Uber Eats Manager. Create them in Ads Manager for:
- Unified performance view
- Better audience targeting on offers
- Self-serve control (no waiting for the AM)
- Coordinated reporting

#### 2. Pair Existing Ad Campaigns with Offers

| Current Ad Campaign | Pair With This Offer | Rationale |
|---------------------|---------------------|-----------|
| All New To Brand 2 (£200/wk) | BOGO Wraps or 25% Off | Visibility + conversion incentive for new customers |
| Location campaigns (£100/wk each) | Free Delivery or Free Side >£30 | Visibility + friction removal / basket boost |
| All Uber One (£400/wk) | Free Soft Drink >£15 | Visibility + loyalty reward |
| All Health Conscious (£200/wk) | 10-15% shop-wide discount | Capture search traffic + close the sale |
| All High-Volume Cuisine (£200/wk) | BOGO on Chicken Wrap (Halal) | High volume halal keyword + strong conversion |
| All Core Greek (£200/wk) | Discount on Skepasti | Defend core category + promote signature dish |

#### 3. Use the Offers Location Report
Report #7 in Ads Manager — currently shows nothing because there are 0 offer campaigns. Once offers are created here, this report becomes valuable for location-level offer performance analysis.

### Medium-Term Upgrades

#### 4. Brand-Level Customer Targeting for Offers
Instead of per-location offers, target first-time customers across all 6 locations from a single campaign. This is especially powerful now that Chiswick is launching.

#### 5. Deploy Happy Hour Offers (New Type)
Dark kitchens could fill quiet 14:00–17:00 slots. Pair with a scheduled ad campaign using dayparting for the same hours. Example:
- Ad: Sponsored Listing scheduled 14:00–17:00 only
- Offer: Happy Hour 20% off or Free Delivery
- Target: All customers within delivery radius

#### 6. Add Custom Creatives to Combined Campaigns
The AI already recommends "+10–20% in sales" from adding creatives to every current campaign. With an offer attached, the creative can showcase the deal (e.g., "BOGO Greek Wraps — Today Only").

#### 7. Explore the Offers API
Uber now supports nearly all offer types via API. This could eventually integrate with the Deliverect/POS pipeline for automated offer management.

---

## 5. Risks and Watch-Outs

### Double-Counting Offers
If you start creating offers in Ads Manager, ensure the Account Manager isn't also creating overlapping offers in Uber Eats Manager. You could accidentally run duplicate offers. **Action**: Coordinate with current AM (Joshua) to agree on a single platform for offer management going forward.

### Budget Implications
Running offers in Ads Manager may affect your ad budget allocation. Clarify whether:
- Offer spend counts toward the £6,000/month contractual minimum
- Uber's BOGO co-funding (£3,000/mo Paddington, £1,250/mo per kitchen) still applies
- Offers in Ads Manager are billed through the same weekly/monthly billing as ads

### Contractual Compliance
Get written confirmation from the AM that:
- Moving offers to Ads Manager satisfies the contractual offer minimums
- Uber co-funding applies regardless of which platform creates the offer
- Given the history of 5 AMs in 12 months, document everything in writing

### Reporting Fragmentation
During any transition period, offer data will be split between:
- Historical offers in Uber Eats Manager (past performance)
- New offers in Ads Manager (going forward)

Plan for a clean cutover date rather than a gradual migration to keep reporting clean.

---

## 6. Implementation Roadmap

### Phase 1: Explore & Validate (This Week)
- [ ] Log into Ads Manager → Offers section and explore the creation flow
- [ ] Check for any Uber-funded campaign opportunities
- [ ] Document exact steps and any IAGTM-specific limitations
- [ ] Confirm with AM that offers in Ads Manager count toward contractual minimums

### Phase 2: Pilot (Week 2)
- [ ] Create one combined campaign: New To Brand ad + BOGO offer for a single location
- [ ] Run alongside existing separate campaigns for comparison
- [ ] Monitor unified reporting for 7 days

### Phase 3: Migrate (Week 3–4)
- [ ] Move all offers from Uber Eats Manager to Ads Manager
- [ ] Pair each ad campaign with its corresponding offer (per the table above)
- [ ] Coordinate with AM to stop creating offers in UEM
- [ ] Set up Happy Hour offers for off-peak slots

### Phase 4: Optimize (Ongoing)
- [ ] Use brand-level targeting for cross-location acquisition
- [ ] Deploy custom creatives that showcase offers
- [ ] Review the Offers Location Report weekly
- [ ] Explore Offers API for automation

---

## Sources

- [Feb 2026 Ads & Offers Updates — Uber Eats](https://merchants.ubereats.com/bo/en/resources/articles/product-highlights/feb-2026-ads-offers-updates/)
- [May 2025 Ads Manager Update — Uber Eats](https://merchants.ubereats.com/us/en/resources/articles/product-highlights/may-2025-ads-manager-update/)
- [Managing Campaigns and Offers — Uber Help](https://help.uber.com/en/merchants-and-restaurants/article/managing-campaigns-and-offers-through-uber-eats-manager?nodeId=f219d6d1-3ffa-4a3c-b223-af08e4691df6)
- [Using Uber Ads Manager — Uber Help](https://help.uber.com/en/merchants-and-restaurants/article/using-uber-ads-manager?nodeId=e43f8bbf-4db9-4b37-91fb-52e8198f7464)
- [UK Marketing Questions — Uber Blog](https://www.uber.com/en-GB/blog/marketing-questions/)
- [Building Smarter Features to Power Offers — May 2025](https://merchants.ubereats.com/us/en/resources/articles/product-highlights/offers-updates-may-2025/)
