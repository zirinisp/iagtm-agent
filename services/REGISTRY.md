# Services Registry

Reusable scripts and API clients. **Check here before writing a new script.**

Last updated: 2026-03-09

---

## lightspeed/

| Script | Purpose | Input | Output | Created |
|--------|---------|-------|--------|---------|
| `lightspeed-client.js` | API client with auto-reauth on 403 via CDP browser | Import as module | JS module — exports `getAllFinancials`, `getDailySalesV2`, etc. | 2026-03-06 |
| `auth-server.js` | Local OAuth callback server for Lightspeed auth flow | Started by `reauth.js` | Captures OAuth token | 2026-03-06 |
| `reauth.js` | Re-authenticate Lightspeed via CDP browser when token expires | Called automatically by client on 403 | Refreshes stored token | 2026-03-06 |
| `daily-sales-report.js` | Daily revenue summary by location | `--date YYYY-MM-DD` (optional) | Console output | 2026-03-09 |
| `chiswick-sales.js` | Chiswick-specific sales data | None | Console output | 2026-03-09 |
| `test-all-endpoints.js` | Tests all known Lightspeed API endpoints | None | Console — pass/fail per endpoint | 2026-03-06 |
| `test-api.js` | Quick API connectivity test | None | Console | 2026-03-06 |

## xero/

| Script | Purpose | Input | Output | Created |
|--------|---------|-------|--------|---------|
| `xero-client.js` | Xero API client with OAuth2 token management | Import as module | JS module | 2026-03-08 |
| `xero-auth.js` | Xero OAuth2 authentication flow | None | Stores token | 2026-03-08 |
| `test-connection.js` | Quick Xero API connectivity test | None | Console | 2026-03-08 |
| `fetch-grl-pnl.mjs` | Fetch Greek Restaurant Ltd (Paddington) P&L from Xero for Dec 2025 - Feb 2026 | None (months hardcoded) | JSON files in script directory (raw + structured) | 2026-03-08 |
| `fetch-pagema-pnl.mjs` | Fetch Pagema Ltd P&L from Xero by branch tracking category for Dec 2025 - Feb 2026 | None (months/branches hardcoded) | `pagema-pnl-raw.json` in script directory | 2026-03-08 |

**Note:** `fetch-grl-pnl.mjs` and `fetch-pagema-pnl.mjs` were migrated from `reports/output/`. Their import path `../../services/xero/xero-client.js` needs updating to `./xero-client.js` — separate task.

## deputy/

| Script | Purpose | Input | Output | Created |
|--------|---------|-------|--------|---------|
| `deputy-client.js` | Deputy API client for scheduling and timesheet data | Import as module | JS module | 2026-03-06 |
| `test-connection.js` | Quick Deputy API connectivity test | None | Console | 2026-03-06 |

## reports/

| Script | Purpose | Input | Output | Created |
|--------|---------|-------|--------|---------|
| `generate-grl-pnl.py` | Generate branded GRL (Paddington) P&L reports in HTML, PDF, MD, XLSX | `grl-pnl-paddington-dec25-feb26.json` in script dir | HTML, PDF, MD, XLSX in script dir | 2026-03-08 |
| `generate-pagema-pnl.py` | Generate branded Pagema P&L by branch reports in HTML, PDF, MD, XLSX | `pagema-pnl-raw.json` in script dir | HTML, PDF, MD, XLSX in script dir | 2026-03-08 |
| `generate-consolidated-pnl.py` | Consolidated multi-entity P&L merging GRL + Pagema data into single report | `grl-pnl-paddington-dec25-feb26.json` + `pagema-pnl-raw.json` in script dir | HTML, PDF, XLSX, MD in script dir | 2026-03-08 |
| `staff-cost-report.py` | Weekly staff cost PDF report across all locations with bar charts and KPIs | Hardcoded data (Deputy) | PDF in script dir | 2026-03-07 |
| `turnover-vs-labour.py` | Paddington turnover vs staff cost analysis with hourly and daily breakdowns | `/tmp/pad-data.json` (hardcoded) | PDF in script dir | 2026-03-07 |

**Notes on hardcoded paths (separate task to fix):**
- `generate-grl-pnl.py`, `generate-pagema-pnl.py`, `generate-consolidated-pnl.py`: Read input JSON from `os.path.dirname(__file__)` — will need data files alongside or path arguments added
- `staff-cost-report.py`: Output path hardcoded to `reports/output/` — needs updating
- `turnover-vs-labour.py`: Input from `/tmp/pad-data.json`, output to `reports/output/` — needs updating

## google-drive/

| Script | Purpose | Input | Output | Created |
|--------|---------|-------|--------|---------|
| `gdrive-client.js` | Google Drive API client — folder lookup and link generation for Shared Drive | Import as module or CLI: `node gdrive-client.js <folder-name>` | Google Drive URL | 2026-03-09 |
| `gdrive-auth.js` | One-time OAuth2 authorization flow for Google Drive API | None (opens browser) | Stores tokens to `tokens.json` | 2026-03-09 |

## reports/output/ (one-off scripts — not migrated)

| Script | Purpose | Why not migrated |
|--------|---------|-----------------|
| `2026-03-08-transitory-investigation.py` | Lightspeed TRANSITORY records investigation report for 8 March 2026 | One-off investigation with hardcoded findings data specific to that date |
