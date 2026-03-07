# Xero API Endpoints Reference

Client: `services/xero/xero-client.js` (ES module)

All endpoints tested and verified on 2026-03-06. All 12 tests passed.

---

## Tenants

| Shortcut | Organisation Name | ShortCode | Currency | FY End |
|----------|------------------|-----------|----------|--------|
| `grl` (default) | Greek Restaurant Ltd | !kh5BZ | GBP | 31 Jul |
| `pagema` | Pagema Ltd | !0GC7T | GBP | — |

Both are COMPANY type, Xero ULTIMATE/BUSINESS edition. GRL uses ACCRUAL basis, QUARTERLY VAT.

Pass tenant as last argument (or in options object) to switch: e.g., `getOrganisation('pagema')` or `getProfitAndLoss(from, to, { tenant: 'pagema' })`.

---

## Rate Limits

- **60 calls per minute** (header: `x-minlimit-remaining`)
- **5,000 calls per day** (header: `x-daylimit-remaining`)
- Rate limit problem indicated by `x-rate-limit-problem` header
- The client logs these automatically when present

---

## Endpoints

### 1. `getOrganisation(tenant?)`

Returns organisation details.

**Response:** `{ Organisations: [{ ... }] }`

**Key fields:**
- `Name`, `LegalName`, `ShortCode`, `OrganisationID`
- `OrganisationType` (COMPANY), `BaseCurrency` (GBP), `CountryCode` (GB)
- `FinancialYearEndDay` (31), `FinancialYearEndMonth` (7 = July)
- `SalesTaxBasis` (ACCRUAL), `SalesTaxPeriod` (QUARTERLY)
- `Edition` (BUSINESS), `Class` (ULTIMATE)
- `RegistrationNumber`, `TaxNumber`
- `Addresses[]`, `Phones[]`, `ExternalLinks[]`, `PaymentTerms`

---

### 2. `getTrackingCategories(tenant?)`

Returns tracking categories used for location/department tracking.

**Response:** `{ TrackingCategories: [{ ... }] }`

**GRL has 2 tracking categories:**

#### Category: "Tracking" (ID: `53c6092c-5348-4fdc-9643-b0f6019fa3c9`)
29 options including location codes:
- **Location stores:** `BRT` (Brent Cross), `FK` (Fulham/King St), `GM` (Greek Menu/Paddington), `MT` (Marylebone/Thayer), `POG` (Pog/Baker St), `PZ` (unclear), `SHR` (Shepherd's Bush/Westfield), `TA` (Tallinn?)
- **Sub-locations with 's' prefix:** `sFK`, `sGM`, `sMT`, `sPZ` (likely sub-accounts)
- **Special:** `DLV0` (Delivery?), `MtG`, `Tallinn`, `MT Travel`, `Transfer/Uber`
- **Internal prefixed with '_':** `_ANNA`, `_AR`, `_JUSTEATMISTAKE`, `_KM`, `_PZ`
- **Other:** `2020 Renovation`, `2026 Renovation`, `Leader Bonus`, `Staff Bonus`
- **Sales areas:** `SalesBasement`, `SalesDelivery`, `SalesGroundFloor`

#### Category: "Sales" (ID: `01855daa-a107-45fc-9035-46dbff68ac4e`)
24 options split by channel:
- **Restaurant (RES-):** Bakaliko, Beer-Shots, Coffee, Desserts, Grill, Kitchen, Salads, SoftDrinks, Starters, Various, Wines
- **Delivery (DEL-):** Bakaliko, Beer-Shots, Coffee, DeliverectBoth, Desserts, Grill, Kitchen, Salads, SoftDrinks, Starters, Various, Wines
- **Other:** Catering

Each option has a `TrackingOptionID` (UUID) and `Status` (ACTIVE).

---

### 3. `getAccounts(tenant?)`

Returns the chart of accounts.

**Response:** `{ Accounts: [{ ... }] }`

- **GRL count:** 235 accounts
- **Key fields per account:** `AccountID`, `Code`, `Name`, `Type` (BANK, REVENUE, EXPENSE, etc.), `Class` (ASSET, EQUITY, LIABILITY, REVENUE, EXPENSE), `Status`, `TaxType`, `BankAccountNumber`, `BankAccountType`, `CurrencyCode`, `ReportingCode`, `ReportingCodeName`, `EnablePaymentsToAccount`, `ShowInExpenseClaims`, `HasAttachments`

---

### 4. `getTaxRates(tenant?)`

Returns tax rates configured in Xero.

**Response:** `{ TaxRates: [{ ... }] }`

- **GRL count:** 24 tax rates
- **Key fields:** `Name`, `TaxType` (e.g., TAX002, TAX003, CAPEXSRINPUT), `EffectiveRate` (e.g., 12.5, 15, 20), `Status` (ACTIVE/PENDING), `ReportTaxType`, `CanApplyToAssets/Equity/Expenses/Liabilities/Revenue`, `DisplayTaxRate`, `TaxComponents[]`

---

### 5. `getContacts(params?)`

Returns contacts (suppliers and customers). Supports pagination.

**Response:** `{ Contacts: [{ ... }] }`

- **GRL count:** 2,239 contacts
- **Key fields:** `ContactID`, `Name`, `ContactStatus` (ACTIVE), `EmailAddress`, `IsSupplier`, `IsCustomer`, `DefaultCurrency`, `Addresses[]`, `Phones[]`, `ContactGroups[]`, `ContactPersons[]`, `BankAccountDetails`, `HasAttachments`
- **Params:** `{ page, where, order, IDs, tenant }`

---

### 6. `getProfitAndLoss(fromDate, toDate, options?)`

Returns Profit & Loss report. See "Report Response Structure" below.

**Params:** `fromDate` (YYYY-MM-DD), `toDate` (YYYY-MM-DD), options: `{ trackingCategoryID, trackingOptionID, periods, timeframe, tenant }`

**GRL Feb 2026 snapshot:**
- Total Income: 99,084.83
- Total Cost of Sales: 25,564.41
- Gross Profit: 73,520.42

**Pagema Feb 2026 snapshot:**
- Total Income: 120,619.39
- Total Cost of Sales: 45,036.77
- Gross Profit: 75,582.62

**P&L sections (RowTypes):** Header, Income, Less Cost of Sales, [Gross Profit], Less Operating Expenses, [Net Profit], [blank]

---

### 7. `getBalanceSheet(date, options?)`

Returns Balance Sheet report. See "Report Response Structure" below.

**Params:** `date` (YYYY-MM-DD), options: `{ periods, timeframe, trackingOptionID1, tenant }`

**Note:** Balance Sheet has 3 columns by default: label, current date, same date prior year.

**Sections (12 rows):** Header, Assets (title only), Bank, Current Assets, Fixed Assets, Total Assets, Liabilities (title only), Current Liabilities, Non-Current Liabilities, Total Liabilities, Net Assets, Equity

---

### 8. `getTrialBalance(date, options?)`

Returns Trial Balance report. See "Report Response Structure" below.

**Params:** `date` (YYYY-MM-DD), options: `{ paymentsOnly, tenant }`

**Trial Balance has 5 columns:** Account, Debit, Credit, YTD Debit, YTD Credit

**Sections:** Header, Revenue (6 accounts), Expenses (56 accounts), Assets (37 accounts), Liabilities, Equity + totals

---

### 9. `getInvoices(params?)`

Returns invoices. Paginated (100 per page).

**Response:** `{ Invoices: [{ ... }] }`

- **Key fields:** `InvoiceID`, `InvoiceNumber`, `Type` (ACCPAY=bill, ACCREC=invoice), `Status` (AUTHORISED, PAID, VOIDED, DRAFT), `Contact.Name`, `DateString`, `DueDateString`, `SubTotal`, `TotalTax`, `Total`, `AmountDue`, `AmountPaid`, `AmountCredited`, `CurrencyCode`, `CurrencyRate`, `Reference`, `LineAmountTypes`, `LineItems[]`, `Payments[]`, `CreditNotes[]`, `Prepayments[]`, `Overpayments[]`, `HasAttachments`, `IsDiscounted`
- **Params:** `{ page, where, order, modifiedAfter, IDs, tenant }`

---

### 10. `getBankTransactions(params?)`

Returns bank transactions. Paginated (100 per page).

**Response:** `{ BankTransactions: [{ ... }] }`

- **Key fields:** `BankTransactionID`, `BankAccount` (object with AccountID, Name, Code), `Type` (SPEND, RECEIVE), `Status` (AUTHORISED, DELETED), `Contact.Name`, `DateString`, `Reference`, `SubTotal`, `TotalTax`, `Total`, `IsReconciled`, `CurrencyCode`, `LineAmountTypes`, `LineItems[]`, `HasAttachments`
- **Params:** `{ page, where, order, tenant }`

---

## Report Response Structure (P&L, Balance Sheet, Trial Balance)

All three report endpoints return the same nested structure:

```
{
  "Reports": [{
    "ReportID": "...",
    "ReportName": "Profit and Loss",
    "ReportType": "ProfitAndLoss",
    "ReportDate": "6 March 2026",
    "UpdatedDateUTC": "/Date(1772838281275)/",
    "Rows": [
      {
        "RowType": "Header",
        "Cells": [{ "Value": "" }, { "Value": "28 Feb 26" }]
      },
      {
        "RowType": "Section",
        "Title": "Income",
        "Rows": [                          // <-- nested Rows inside Section
          {
            "RowType": "Row",
            "Cells": [
              {
                "Value": "Account Name",
                "Attributes": [{ "Id": "account", "Value": "<AccountID UUID>" }]
              },
              {
                "Value": "1234.56",
                "Attributes": [{ "Id": "account", "Value": "<AccountID UUID>" }]
              }
            ]
          },
          {
            "RowType": "SummaryRow",
            "Cells": [
              { "Value": "Total Income" },
              { "Value": "99084.83" }
            ]
          }
        ]
      },
      ...more Sections...
    ]
  }]
}
```

### Key parsing rules:

1. **Top-level `Rows[]`** contains Header + Section rows
2. **Header row** defines column labels (varies by report type)
3. **Section rows** have a `Title` and nested `Rows[]` array
4. **Nested rows** are either `Row` (data) or `SummaryRow` (totals)
5. **Cells** are positional -- index matches the Header columns
6. **Attributes** on cells contain `{ Id: "account", Value: "<AccountID>" }` linking to the chart of accounts
7. **Values are strings** -- must be parsed to numbers for calculations
8. **Empty string** means zero/no value for that cell
9. **Some sections have Title="" with a single row** for computed lines (e.g., "Gross Profit", "Net Profit")

### Column counts by report:

| Report | Columns | Column Labels |
|--------|---------|---------------|
| P&L | 2 | (blank), date |
| Balance Sheet | 3 | (blank), current date, prior year date |
| Trial Balance | 5 | Account, Debit, Credit, YTD Debit, YTD Credit |

### UpdatedDateUTC format:

The `/Date(...)/ ` format is milliseconds since Unix epoch. Parse with: `new Date(parseInt(str.match(/\d+/)[0]))`
