# TooGoodToGo (TGTG) Research — IAGTM

**Date:** 2026-03-14
**Period:** Jan 14 – Mar 14, 2026 (2 months)

## Key Finding

TGTG is tracked in Lightspeed via:
- **Payment method:** "Good To Go" (code: `GOTOGO`, pmId: `243172458368382`)
- **7 dedicated POS products** with SKU prefix `K-TGTG-*`
- Available on all 6 locations, but only 4 actively use it

## Grand Summary

| Location | TGTG Receipts | Revenue | Avg/Receipt | % of Total Receipts |
|----------|--------------|---------|-------------|---------------------|
| **Paddington** | 96 | £1,407.62 | £14.66 | 1.21% |
| **Brent** | 24 | £226.01 | £9.42 | 0.89% |
| **Shoreditch** | 21 | £130.48 | £6.21 | 0.11% |
| **Peckham** | 9 | £65.24 | £7.25 | 0.49% |
| Wandsworth | 0 | £0.00 | — | 0% |
| Chiswick | 0 | £0.00 | — | 0% |
| **ALL** | **150** | **£1,829.35** | **£12.20** | **0.44%** |

## TGTG Product Catalogue (POS Codes)

| SKU | Product | Price | Top Location |
|-----|---------|-------|-------------|
| K-TGTG-PIES | Pies-Too Good to Go | ~£4.66 | Paddington (102x) |
| K-TGTG-SKPLAT | Skewer Platter-Too Good to Go | ~£4.66 | Paddington (101x) |
| K-TGTG-WRAP | Wrap-Too Good to Go | ~£2.33 | Paddington (48x), Shoreditch (16x) |
| K-TGTG-GRILL | Grill Bag-Too Good to Go | ~£4.66 | Brent (17x), Peckham (14x), Shoreditch (14x) |
| K-TGTG-SALAD | Salads-Too Good To Go | ~£6.67 | Paddington (19x) |
| K-TGTG-SKEP | Skepasti Too Good to Go | ~£4.66 | Paddington (9x) |
| K-TGTG-KITCHEN | Kitchen Bag-Too Good to Go | ~£4.99 | Paddington (9x) |

**Note:** Paddington also sells regular menu items through TGTG payment (Falafel Wrap, Pork Skepasti, Chicken Fillet Platter, Pies of Greece items).

## Location Deep-Dives

### Paddington (96 receipts, £1,407.62)
- **Most active** — consistent daily usage since Jan 28 (1-6 receipts/day)
- **Multi-item bags** — avg £14.66 per receipt (highest), multiple bag types per transaction
- **Peak hours:** 11:00-13:00 (lunchtime surplus) with spread through to 21:00
- **All 7 TGTG products used** plus regular menu items
- **Even distribution** across weekdays (11-18 per day of week)

### Brent (24 receipts, £226.01)
- Started Feb 4, relatively consistent through Mar 12
- **Products:** Grill bags (17x), Pies (13x), Platters (12x), Wraps (11x), Skepasti (1x)
- **Peak hours:** 16:00-19:00 (end of dark kitchen shift)
- **Weekend-heavy:** Saturday (6), Thursday/Friday (4-5 each)

### Shoreditch (21 receipts, £130.48)
- Active Jan 16 – Mar 2, then **stopped completely**
- Only 2 product types: Wraps (16x) and Grill bags (14x), plus 3 Platters and 3 Pies
- **Low avg receipt:** £6.21 (single-item bags)
- Despite having 19K total receipts (highest volume location), TGTG is only 0.11%

### Peckham (9 receipts, £65.24)
- Active Jan 14 – Feb 17, then **stopped**
- **Only 1 product:** Grill Bag (14 units across 9 receipts)
- **Peak hours:** 15:00-16:00 only
- Monday-heavy (5 of 9 receipts)

### Wandsworth — ZERO TGTG sales
- Payment method exists but never used in this period

### Chiswick — ZERO TGTG sales
- New location (launched Mar 6), payment method exists, not yet activated

## Kitchen Efficiency Insights

### Signal 1: Over-production
High TGTG sales on specific items → kitchen making too much
- **Paddington Pies** (102 TGTG units) and **Skewer Platters** (101 units) — most over-produced items
- Dark kitchens focus on **Grill Bags** — suggests consistent grill over-production

### Signal 2: Bad Waste Management
High AvT variance + LOW/ZERO TGTG sales → food thrown away instead of sold
- **Wandsworth** — zero TGTG despite having the payment method → all surplus is wasted
- **Shoreditch stopped in March** — did waste management improve, or did they just stop using TGTG?
- **Peckham stopped in Feb** — same question

### Cross-Reference Needed
Compare TGTG items with Marketman AvT data:
- If an item has high variance AND high TGTG → over-production (systemic)
- If an item has high variance AND low TGTG → waste management failure
- If an item has low variance AND low TGTG → efficient production

## How TGTG Receipts Work in Lightspeed

1. Staff creates order on POS
2. Selects TGTG-specific products (K-TGTG-* SKUs) — "bag types"
3. Modifiers (child lines, £0.00) specify actual items inside the bag
4. Payment closed using "Good To Go" (GOTOGO) payment method
5. Some receipts mix TGTG products with regular menu items

## Files
- `tgtg-research.js` — Script used to pull this data
- `tgtg-results.json` — Full JSON results with sample receipts
