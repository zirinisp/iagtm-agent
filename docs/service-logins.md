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
  2. Enter `paz.n8n@gmail.com` and click "Continue"
  3. Page shows "Your social account is connected" with options:
     - **Option A**: "Continue with Google" — opens popup (may not work in Playwright)
     - **Option B**: "Login with email" — sends 4-digit OTP to `paz.n8n@gmail.com`
  4. Enter OTP code
- **Logout**: Click "MA" avatar (top right) > "Log out"
- **Automated re-login flow** (via Playwright):
  1. Navigate to https://merchants.ubereats.com/manager/ (redirects to auth.uber.com)
  2. Fill email `paz.n8n@gmail.com`, click "Continue"
  3. Click "Login with email" (sends 4-digit OTP)
  4. Open Gmail in browser: `https://mail.google.com/mail/u/0/#search/from%3Auber+newer_than%3A1h`
  5. Read the OTP code from the email
  6. Navigate back to auth.uber.com, enter the 4 digits
  7. Page shows "Welcome back, Michael" — click "Continue with Google"
  8. **BLOCKER**: Google SSO opens a popup that Playwright cannot handle
- **Note**: The full automated flow gets stuck at the final Google SSO popup step. If session expires, the quickest fix is to manually click "Continue with Google" in Chrome on Paddington. The OTP+email step can be automated (read OTP from Gmail browser), but the final Google popup cannot.

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

- **Uber login**: OTP step works via Playwright (read code from Gmail browser). But the final Google SSO step opens a popup that Playwright can't handle. Requires manual click in Chrome if session expires.
- **Asana plugin MCP**: Token expires periodically. The Claude AI Asana MCP works as a reliable fallback.
- **Gmail MCP**: Connected to `info@paz-labs.com`. For `paz.n8n@gmail.com` emails, use browser Gmail via Playwright.
