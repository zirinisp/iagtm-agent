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

> **IMPORTANT — Unassigned entries:** When pulling per-branch P&L, always compare the unfiltered total against the sum of all branches. The difference is "unassigned" — transactions not tagged to any branch.

**GRL has 2 tracking categories:**

#### Category: "Tracking" (ID: `53c6092c-5348-4fdc-9643-b0f6019fa3c9`) — 29 options

| Option | TrackingOptionID | Notes |
|--------|-----------------|-------|
| GM | `17d45158-73a3-4d27-9335-830a336314d8` | Greek Menu / Paddington |
| BRT | `e764b284-f356-4531-9afd-c67ecf8b18cb` | Brent Cross |
| FK | `f341a382-ef9d-4b49-a9e7-d700b9e2565f` | Fulham / King St |
| MT | `13b26a05-769f-4d67-b541-edc015fdc56b` | Marylebone / Thayer |
| SHR | `35bbc52a-59c6-4ae1-a4e3-5e05a0f3a811` | Shepherd's Bush / Westfield |
| POG | `1c41bab1-5423-41ac-a3d9-b60e5bbae74d` | Pies of Greece / Baker St |
| PZ | `a9c7eec3-ed2a-4dbe-8fec-876f8b8c3499` | — |
| TA | `44c99ddf-6679-4780-b1e7-0264adea65ca` | Tallinn |
| DLV0 | `acf5e7c4-1977-4d4b-b5f9-aa030adea2bc` | Delivery |
| MtG | `06503e57-ea91-4660-b1a9-5a6bb06f049d` | — |
| Tallinn | `c58197d5-b544-431f-9286-0c1ab5495b37` | — |
| Transfer/Uber | `d60d84da-c9c4-4879-adba-f1bd7e8c8600` | — |
| sFK | `c4163534-f41d-4981-ad9d-aae2f47e59ba` | Sub-account |
| sGM | `38c1810e-22d4-4d9d-aef7-7858a0a6ed51` | Sub-account |
| sMT | `bb647f5a-3461-448f-ba31-bf4468e804f1` | Sub-account |
| sPZ | `ea2c1855-31ac-415f-93fd-5d779742eae5` | Sub-account |
| _ANNA | `5fbec9be-a2e3-49f5-8de9-12c2da099815` | Internal |
| _AR | `8fc7092e-ac36-44c3-b1be-73186769c023` | Internal |
| _JUSTEATMISTAKE | `53dbf7b5-9656-4de5-a080-dba25ccb005d` | Internal |
| _KM | `2fd0d507-35ed-40fc-8a57-bc820c123502` | Internal |
| _PZ | `f0d5d9d4-2070-4c9d-a44a-cd25b1f42562` | Internal |
| 2020 Renovation | `8a537d4f-2969-460c-b0a1-387d2620df80` | — |
| 2026 Renovation | `574cfe65-9f48-450e-952c-7678fff7499a` | — |
| Leader Bonus | `789ee757-2c85-490b-b924-73ed0a150e8c` | — |
| Staff Bonus | `16312c8c-c636-4392-bbd5-9734dad907ba` | — |
| SalesBasement | `8529a80f-0dd8-4053-9746-ae84807071f7` | Sales area |
| SalesDelivery | `dd625d24-c023-4b5c-9aec-13b36574b18c` | Sales area |
| SalesGroundFloor | `74a596c1-4c04-4591-bcca-679386c8a888` | Sales area |
| MT Travel | `d8d954ff-fe2c-4ffa-8688-81e09402b743` | — |

#### Category: "Sales" (ID: `01855daa-a107-45fc-9035-46dbff68ac4e`) — 24 options
Split by channel: `DEL-*` (delivery) and `RES-*` (restaurant) for departments: Bakaliko, Beer-Shots, Coffee, DeliverectBoth, Desserts, Grill, Kitchen, Salads, SoftDrinks, Starters, Various, Wines. Plus Catering.

**Pagema has 2 tracking categories:**

#### Category: "Branch" (ID: `8c350f31-8ef3-4556-b5d6-4734d3944c4c`) — **use this for per-branch P&L**

| Branch | TrackingOptionID |
|--------|-----------------|
| Brent | `42d7bf0e-f6ce-45a9-8172-30fd7b308aff` |
| Chiswick | `0a08c562-a217-438e-9bc2-2fe80a4d6c7d` |
| Peckham | `e1d076d7-6e77-423a-9b02-7647dc9b690c` |
| Shoreditch | `d9a8f6cb-0c2f-4663-8112-36af5aff58df` |
| Wandsworth | `7f42983d-9a9d-4731-aba2-6a9ce85d075f` |

#### Category: "Tracking" (ID: `cf49591a-8fe5-4409-a186-6728a9c1f88e`) — 9 options

| Option | TrackingOptionID | Notes |
|--------|-----------------|-------|
| POG | `85f7cc01-af75-4d80-b2e2-5ad314d5e47e` | Pies of Greece |
| sAD | `1c710468-3d37-4afc-89df-65e2be8fae61` | Sub-account |
| sFK | `8f42be5f-848c-4fe1-9ef0-60f6b6244407` | Sub-account FK |
| sGM | `ba97b0cf-40c9-4853-aee8-da1bdf7add58` | Sub-account GM |
| sMT | `388b1a81-8ba9-4e75-9199-9bd447be8a79` | Sub-account MT |
| sPZ | `17606c70-7bef-40fd-b343-48fe7ddf662e` | Sub-account PZ |
| Leader Bonus | `e38328b4-2ba2-41c5-87c3-c775ced946f7` | — |
| Staff Bonus | `66ab2636-adfd-4d28-a194-4bd472516d43` | — |
| The Blue | `57be8dcd-649d-4645-bb20-bd3373d200cd` | — |

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
