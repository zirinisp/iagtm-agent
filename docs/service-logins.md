# Service Login Guide

How the agent authenticates to each external service. **No passwords are stored here** — credentials are in macOS Keychain on Paddington.

---

## 1. GitHub
- **Method**: CLI (`gh auth`)
- **Account**: `michaelai-iagtm`
- **Verify**: `gh auth status`
- **Re-login**: `gh auth login`

## 2. Asana
- **Method**: MCP integration (Claude AI Asana) + Chrome (Google SSO)
- **URL**: https://app.asana.com
- **Account**: Auto-logged in via Google (`paz.n8n@gmail.com`)
- **Verify**: Navigate to https://app.asana.com — should auto-login
- **MCP tools**: `mcp__claude_ai_Asana__*` (primary), `mcp__plugin_asana_asana__*` (may need periodic re-auth)

## 3. Lightspeed POS (K-Series)
- **Method**: Lightspeed ID (email/password) — Chrome saves credentials
- **URL**: https://pos-admin.lsk.lightspeed.app
- **Login page**: https://id.lightspeed.app/login (redirected on session expiry)
- **Account**: Michael AI / Greek Restaurant Ltd (Business ID 14154)
- **Keychain service**: `lightspeed` (username: `paz.n8n@gmail.com`)
- **How to re-login**:
  1. Navigate to https://pos-admin.lsk.lightspeed.app (redirects to id.lightspeed.app)
  2. Fill "Username" with email
  3. Fill "Password" from Keychain
  4. Click "Log in"
  5. Redirects to Backoffice dashboard
- **Logout**: Click "Michael AI" (top right) > "Logout"

## 4. Uber Eats Manager
- **Method**: Uber auth (email + OTP or Google SSO popup)
- **URL**: https://merchants.ubereats.com/manager/
- **Login page**: https://auth.uber.com
- **Account**: `paz.n8n@gmail.com` (Michael AI, 6 shops)
- **How to re-login**:
  1. Navigate to https://merchants.ubereats.com/manager/ (redirects to auth.uber.com)
  2. Login page now asks "What's your phone number or email?" with options:
     - Enter email + "Continue" → proceeds to password/OTP step
     - **"Continue with Google"** — opens popup (may not work in Playwright)
     - **"Continue with Apple"** — Apple SSO option
  3. After entering email, page may show "Your social account is connected" with Google SSO
  4. Enter OTP code if using email login method
- **Logout**: Click "MA" avatar (top right) > "Log out"
- **Automated re-login flow** (via Playwright — WORKING as of 5 March 2026):
  1. Navigate to https://merchants.ubereats.com/manager/ (redirects to auth.uber.com)
  2. Fill email `paz.n8n@gmail.com`, click "Continue"
  3. Click "Login with email" (sends 4-digit OTP to paz.n8n@gmail.com)
  4. Navigate to Gmail: `https://mail.google.com/mail/u/0/#search/from%3Auber+newer_than%3A1h`
  5. Open the latest "Your Uber account verification code" email, read the 4-digit code
  6. Navigate back to auth.uber.com (page resets — enter email again, click Continue, click "Login with email" to trigger another OTP)
  7. Read the NEW OTP from Gmail (or try the previous code — Uber sometimes accepts recent codes)
  8. Enter the 4 digits one by one in the OTP fields — auto-submits and redirects to dashboard
  9. **NO Google SSO popup needed** — the OTP flow completes login directly
- **Key insight**: The OTP "Login with email" path bypasses the Google SSO popup entirely. No manual intervention needed. The previous blocker (Google SSO popup) only applies if you click "Continue with Google".

## 5. Uber Ads Manager
- **Method**: Shares authentication with Uber Eats Manager (same Uber account)
- **URL**: https://advertiser.uber.com
- **Account**: IAGTM UK (Ad Account ID: `77f96be0-b32c-4927-8ae6-77e29397cf1a`)
- **How to re-login**: Same as Uber Eats Manager — logging into one logs into both
- **Tested**: Logging out of Uber Ads (`auth.uber.com/login/logout`) and navigating back shows the identical auth.uber.com flow (email → "Continue with Google" popup). Same Google SSO popup limitation applies.
- **Logout URL**: `https://auth.uber.com/login/logout?next_url=advertiser.uber.com`

## 6. Deputy
- **Method**: Google SSO via `paz.n8n@gmail.com`
- **URL**: https://c4cae802074915.uk.deputy.com/#/
- **Login page**: https://once.deputy.com/my/login
- **Account**: It's All Greek to Me
- **How to re-login**:
  1. Navigate to https://once.deputy.com/my/login
  2. Click "Google" link in the "or login with" section
  3. Select `paz.n8n@gmail.com` from Google account chooser
  4. Click "Continue" on Google consent screen
  5. Redirects to https://c4cae802074915.uk.deputy.com/#/

## 7. Marketman
- **Method**: Username/password
- **URL**: https://buyer.marketman.com
- **Login page**: https://buyer.marketman.com/Login.html
- **Keychain service**: `marketman-buyer`
- **Retrieve credentials**: `security find-generic-password -s "marketman-buyer" -w`
- **Account username**: `Michael_AI`
- **How to re-login**:
  1. Navigate to https://buyer.marketman.com
  2. Fill "User Name" with `Michael_AI`
  3. Fill "Password" from Keychain
  4. Click "Login"
  5. Redirects to /Views/Default dashboard

## 8. Deliverect
- **Method**: Email/password (Google SSO does NOT work for this account)
- **URL**: https://frontend.deliverect.com
- **Login page**: https://login.deliverect.com
- **Keychain service**: `deliverect`
- **Retrieve credentials**: `security find-generic-password -s "deliverect" -w`
- **Account email**: `paz.n8n@gmail.com`
- **Account**: It's All Greek To Me (KSERIES)
- **How to re-login**:
  1. Navigate to https://frontend.deliverect.com (redirects to login page)
  2. Fill "Email address" with `paz.n8n@gmail.com`
  3. Fill "Password" from Keychain
  4. Click "Continue"
  5. Redirects to /home with "Welcome Michael!" dashboard
- **Note**: "Continue with Google" returns "We couldn't find your account" — must use email/password

## 9. Xero (Accounting)
- **Method**: Email/password + TOTP (Apple Passwords generates the one-time code)
- **URL**: https://go.xero.com (redirects to dashboard at `go.xero.com/app/!kh5BZ/homepage`)
- **Login page**: https://login.xero.com/identity/user/login
- **Account**: paz.n8n@gmail.com / Password: `AUto1234..`
- **Organisation**: Greek Restaurant Ltd (GRL), org ID: `!kh5BZ`
- **Fiscal year**: August 1 – July 31
- **How to re-login**:
  1. Navigate to https://go.xero.com (redirects to login.xero.com)
  2. Fill "Email address" with `paz.n8n@gmail.com`
  3. Fill "Password" with `AUto1234..`
  4. Click "Log in"
  5. Enter TOTP code from Apple Passwords (Settings → Passwords → Xero)
- **Navigation**: Home, Sales (Sales overview, Invoices, Quotes, Customers), Purchases (Purchases overview, Bills, Purchase orders, Expenses, Suppliers), Reporting (All reports, Favourites: Aged Payables/Receivables, Balance Sheet, P&L, VAT Return, Business snapshot), Accounting (Bank accounts, Fixed assets), Contacts, Projects
- **Key report URLs**:
  - P&L: `reporting.xero.com/!kh5BZ/v2/Run/New/1216`
  - Balance Sheet: `reporting.xero.com/!kh5BZ/v2/Run/New/1217`
  - VAT Return: `reporting.xero.com/!kh5BZ/v2/Run/New/d74c356f-64db-4251-a00b-bdf429e3c01b`
  - All reports: `reporting.xero.com/!kh5BZ`
  - Business snapshot: `go.xero.com/app/!kh5BZ/business-snapshot/`
- **Custom P&L reports**: Profit and Loss - Official - Taxd, No Shareholder, Official - Barclays, Tracking Allocations and Expenses, Official
- **Note**: Xero is the accounting source of truth for IAGTM. The TOTP requirement means automated login needs Apple Passwords integration or manual 2FA code entry.
- **Deputy integration**: Deputy's login page has a "Login with Xero" option, suggesting there may be a Deputy ↔ Xero integration for payroll/timesheets.

## 10. Figma (Design)
- **Method**: MCP integration (Claude AI Figma)
- **Account**: info@paz-labs.com (Pantelis Zirinis), Pro plan, Collab seat
- **Verify**: Call `mcp__claude_ai_Figma__whoami`
- **Note**: Connected via MCP. No browser login needed.

## 11. Canva (Design)
- **Method**: MCP integration (Claude AI Canva)
- **Account**: Connected but no brand kits configured
- **Verify**: Call `mcp__claude_ai_Canva__list-brand-kits`
- **Note**: Connected via MCP but appears to be a fresh/empty account.

## 12. Feedr (Corporate Catering)
- **Method**: Unknown — appears as a payment method in Lightspeed POS
- **Note**: Feedr orders appear as "Feedr #STR1-RCK-XXXXXX CC" and "Feedr #STR2-RCK-XXXXXX CC" in Lightspeed. This is a corporate catering channel that now represents ~20% of revenue for some locations. No separate login documented — orders flow through Lightspeed.

---

## Credential Storage

All passwords are stored in **macOS Keychain** on Paddington. Never commit passwords to this repo.

```bash
# Retrieve a password
security find-generic-password -s "<service-name>" -w

# Store a new password
security add-generic-password -a "<username>" -s "<service-name>" -w "<password>" -U
```

| Keychain Service | Username | For |
|-----------------|----------|-----|
| `marketman-buyer` | `Michael_AI` | Marketman |
| `deliverect` | `paz.n8n@gmail.com` | Deliverect |
| `lightspeed` | `paz.n8n@gmail.com` | Lightspeed POS |

## Google Account

All Google SSO services use: `paz.n8n@gmail.com` (Michael AI)
This account is signed into Chrome on Paddington.

## Gmail Access

The Gmail MCP integration is connected to `info@paz-labs.com` (NOT `paz.n8n@gmail.com`).
To read emails for `paz.n8n@gmail.com`, use the **browser** instead:
```
https://mail.google.com/mail/u/0/
```
Chrome on Paddington is signed into `paz.n8n@gmail.com` — Gmail works via Playwright.

## Known Limitations

- **Uber login**: RESOLVED — Use "Login with email" OTP flow (not Google SSO). Enter email → Continue → "Login with email" → read OTP from Gmail browser → enter digits. Bypasses Google SSO popup entirely. Fully automatable via Playwright.
- **Asana plugin MCP**: Token expires periodically. The Claude AI Asana MCP works as a reliable fallback.
- **Gmail MCP**: Connected to `info@paz-labs.com`. For `paz.n8n@gmail.com` emails, use browser Gmail via Playwright.
