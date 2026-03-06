# Deputy API Research Document

**Date**: 2026-03-06
**Purpose**: Evaluate Deputy API for programmatic access to replace browser automation for IAGTM staff scheduling operations.
**IAGTM Install**: `c4cae802074915.uk.deputy.com` (UK region)
**Account**: It's All Greek To Me (7 locations)

---

## 1. Authentication & OAuth2 Flow

### Authentication Methods

Deputy offers **two** authentication methods:

#### Method A: Permanent Token (Recommended for IAGTM)

This is the simplest path and ideal for a single-install integration like IAGTM.

- **Setup URL**: `https://c4cae802074915.uk.deputy.com/exec/devapp/oauth_clients`
- **Process**:
  1. Navigate to the setup URL (requires admin login)
  2. Click "New OAuth Client"
  3. Fill in: Name, Description, Logo URL (optional), Redirect URI (use `http://localhost`)
  4. Save the client
  5. Click "Get an Access Token" button
  6. **CRITICAL**: The token displays only once. Copy and save it immediately.
- **Token Lifetime**: Permanent (does not expire)
- **Usage**: Include in all API requests as `Authorization: Bearer {token}`
- **Validation**: `GET https://c4cae802074915.uk.deputy.com/api/v1/me` (returns user info if valid)

This is the recommended approach for IAGTM. It avoids the complexity of OAuth2 refresh cycles and mirrors the Lightspeed approach of storing a long-lived token.

#### Method B: OAuth 2.0 (Authorization Code Flow)

Used for multi-tenant applications where multiple Deputy installs connect. Not needed for IAGTM's single-install use case, but documented for completeness.

**Step 1 - Authorization Request:**
```
GET https://once.deputy.com/my/oauth/login
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
  &response_type=code
  &scope=longlife_refresh_token
```

**Step 2 - Token Exchange:**
```
POST https://once.deputy.com/my/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id={client_id}
&client_secret={client_secret}
&redirect_uri={redirect_uri}
&grant_type=authorization_code
&code={authorization_code}
&scope=longlife_refresh_token
```

**Response:**
```json
{
  "access_token": "aa50fa64b2b9824135xxxxxxxxxxxxx",
  "expires_in": 86400,
  "scope": "longlife_refresh_token",
  "endpoint": "{install}.uk.deputy.com",
  "refresh_token": "ef5caf9e931a0f1ecxxxxxxxxxx"
}
```

**Step 3 - Token Refresh:**
```
POST https://c4cae802074915.uk.deputy.com/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id={client_id}
&client_secret={client_secret}
&redirect_uri={redirect_uri}
&grant_type=refresh_token
&refresh_token={refresh_token}
&scope=longlife_refresh_token
```

**OAuth2 Key Details:**
- Access token lifetime: **24 hours**
- Authorization code lifetime: **10 minutes**
- Refreshing a token **invalidates** the old refresh token (a new one is issued)
- Only one scope available: `longlife_refresh_token`
- OAuth client setup: `https://once.deputy.com/my/oauth_clients` (multi-tenant) or `https://{install}.{geo}.deputy.com/exec/devapp/oauth_clients` (single-install)

### Scopes

Deputy's scope model is minimal. The only documented scope is `longlife_refresh_token`. There is no granular scope system (no read-only vs write scopes, no per-resource scopes). The token grants full access to the install based on the user's permissions.

### Token Summary for IAGTM

| Method | Lifetime | Refresh Needed | Complexity | Recommendation |
|--------|----------|----------------|------------|----------------|
| Permanent Token | Permanent | No | Very Low | **Use this** |
| OAuth2 | 24 hours | Yes (daily) | Medium | Not needed for single-install |

---

## 2. API Structure

### Base URL

```
https://{installname}.{geo}.deputy.com/api/v1/...
```

For IAGTM:
```
https://c4cae802074915.uk.deputy.com/api/v1/...
```

### Geographic Regions

| Code | Region |
|------|--------|
| `au` | Australia |
| `uk` | United Kingdom |
| `us` | United States |
| `eu` | Europe |

IAGTM is in the **UK** region.

### API Versions

- **v1**: The primary API version. Covers the vast majority of endpoints. Not deprecated and no plans to deprecate.
- **v2**: Used for a few newer endpoints only (e.g., employee management, sales metrics, agreed hours).
- Deputy's policy: APIs are **typically not deprecated** even when new versions launch. When deprecation is necessary, at least 6 months notice is provided.

### Two API Styles

Deputy has two distinct API patterns:

#### 1. Resource API (`/api/v1/resource/{ObjectName}/...`)

Generic CRUD interface for all 77+ resource objects. Operations:

| Operation | URL Pattern | Method | Purpose |
|-----------|-------------|--------|---------|
| GET one | `/api/v1/resource/{Object}/{id}` | GET | Fetch single record |
| GET all | `/api/v1/resource/{Object}` | GET | List records (max 500) |
| INFO | `/api/v1/resource/{Object}/INFO` | GET | Schema, joins, associations |
| QUERY | `/api/v1/resource/{Object}/QUERY` | POST | Filtered queries with sorting, joins, aggregation |
| CREATE | `/api/v1/resource/{Object}` | POST | Create a record |
| UPDATE | `/api/v1/resource/{Object}/{id}` | POST | Update a record |
| DELETE | `/api/v1/resource/{Object}/{id}/DELETE` | DELETE | Delete a record |
| BULK | `/api/v1/resource/{Object}/BULK` | POST | Bulk upload |

#### 2. Management/Supervise API (`/api/v1/supervise/...` and `/api/management/v2/...`)

Purpose-built endpoints with validation and business logic. These are recommended for write operations as they have "guard rails" to prevent invalid data.

### Query Capabilities (Resource API QUERY)

The QUERY endpoint accepts a POST body with powerful filtering:

```json
{
  "search": {
    "s1": { "field": "StartTime", "data": 1651791600, "type": "gt" },
    "s2": { "field": "Employee", "data": 5, "type": "eq" }
  },
  "sort": { "StartTime": "asc" },
  "start": 0,
  "max": 100,
  "join": ["EmployeeObject", "OperationalUnitObject"]
}
```

**Search Operators:**
| Operator | Meaning |
|----------|---------|
| `eq` | Equals |
| `ne` | Not equals |
| `gt` | Greater than |
| `ge` | Greater than or equal |
| `lt` | Less than |
| `le` | Less than or equal |
| `lk` | Like (with `%` wildcard) |
| `nk` | Not like |
| `in` | In set |
| `nn` | Not null |
| `is` | Is null |
| `ns` | Is not null |

**Advanced Features:**
- **Joins**: Include related object data in a single request (e.g., `EmployeeObject`, `OperationalUnitObject`)
- **Associations**: Add associated object information
- **Aggregation**: `Sum`, `Count`, `CountDistinct` functions
- **Grouping**: Group results by specified fields
- **Sorting**: Ascending/descending by multiple fields

### Pagination

- **Default limit**: 500 records per request
- **Pagination**: Use `start` (offset) and `max` (limit) in QUERY payloads
- **No cursor-based pagination** for Resource API (cursor-based is only in the v2 Employee endpoint)
- For large datasets, use targeted date-range queries to stay under 500

### Rate Limits

Deputy does **not publicly document specific rate limits** (no requests-per-minute or requests-per-second figures found). The API is described as powering their own web, mobile, and kiosk apps, suggesting robust capacity. However, best practice is to implement reasonable delays between bulk operations.

### Response Format

- All responses are **JSON**
- Successful operations return **HTTP 200**
- Error codes: 400 (Bad Request), 401 (Unauthorized), 409 (Conflict), 412 (Precondition Failed)

---

## 3. Available API Endpoints (IAGTM-Relevant)

### 3.1 Employees / Staff Members

**List Employees (v2 - recommended):**
```
GET /api/management/v2/employees
GET /api/management/v2/employees?fieldMask=firstName,lastName,displayName
GET /api/management/v2/employees?cursor={nextCursor}
```
- Cursor-based pagination
- Field mask support for selective data retrieval
- Filter by `externalLinkId[]`

**Add Employee (v2):**
```
POST /api/management/v2/employees
{
  "data": {
    "firstName": "Michael",
    "lastName": "Jones",
    "displayName": "Michael Jones",
    "primaryLocation": 1,
    "workplaces": [...],
    "contact": { "email1": "..." }
  }
}
```
Required fields: `firstName`, `lastName`, `displayName`

**Legacy Employee (v1 Resource API):**
```
POST /api/v1/resource/Employee/QUERY
GET /api/v1/resource/Employee/{id}
```

### 3.2 Locations (Company)

```
GET  /api/v1/resource/Company
GET  /api/v1/resource/Company/{id}
POST /api/v1/resource/Company/QUERY
```

Key fields: `Id`, `CompanyName`, `TradingName`, `Active`, `IsWorkplace`, `Address`, `Contact`, `Code`

**Modify Location Settings:**
```
POST /api/v1/supervise/company/settings          (all locations)
POST /api/v1/supervise/company/{id}/settings      (single location)
```

Settings include: operating hours, clock-in controls, timesheet rounding, roster defaults, break policies.

### 3.3 Areas (OperationalUnit)

```
GET  /api/v1/resource/OperationalUnit
GET  /api/v1/resource/OperationalUnit/{id}
POST /api/v1/resource/OperationalUnit/QUERY
```

Key fields: `Id`, `Company` (location ID), `OperationalUnitName`, `Active`, `WorkType`, `ShowOnRoster`, `Colour`, `RosterSortOrder`

Areas are subdivisions within locations. For IAGTM, Paddington has "FOH" and "BOH" as separate areas. Each location has areas like "Manager", "Shopfloor", "Dispatch/Tablet", "BOH", "BOH Assistant", "Deep Cleaning".

### 3.4 Schedules / Rosters (Shifts)

**Get Shifts (default: -12h to +36h from now):**
```
GET /api/v1/resource/Roster
```

**Query Shifts (recommended - with date filtering):**
```
POST /api/v1/resource/Roster/QUERY
{
  "search": {
    "s1": { "field": "Date", "data": "2026-03-01", "type": "ge" },
    "s2": { "field": "Date", "data": "2026-03-07", "type": "le" }
  },
  "join": ["EmployeeObject", "OperationalUnitObject"]
}
```

Key fields: `Id`, `StartTime`, `EndTime` (unix timestamps), `Employee`, `OperationalUnit`, `TotalTime`, `Cost`, `Published`, `Open`, `ConfirmStatus`, `Mealbreak`, `Comment`

**Shift States:**
- Open: No employee assigned
- Filled: Employee assigned and published
- Locked: Timesheet generated, no changes allowed

**Add/Update Shift:**
```
POST /api/v1/supervise/roster
{
  "intStartTimestamp": 1663084585,
  "intEndTimestamp": 1663138617,
  "intRosterEmployee": 1,
  "intOpunitId": 1,
  "blnPublish": true,
  "intMealbreakMinute": 15,
  "blnOpen": 0,
  "strComment": "Roster via API",
  "intRosterId": 123           // include only for updates
}
```

**Publish Shifts with Notifications:**
```
POST /api/v1/supervise/roster/publish
{
  "intMode": 1,                 // 1=SMS+Email, 2=SMS, 3=Email, 4=None, 5=Confirmation required
  "blnAllLocationsMode": 1,
  "intRosterArray": [123, 124, 125]
}
```

**Auto-Build Shifts:**
```
POST /api/v1/supervise/roster/autobuild
{
  "arrOpUnitIds": [431],
  "intStartTimestamp": 1669813200,
  "intEndTimestamp": 1670417999,
  "freq": 0.25,                 // 0.25=15min, 0.50=30min, 1.0=hourly
  "base": "RequiredStaff",      // or "MinimumCoverage", "Historical"
  "lengths": [4, 8]
}
```
Returns an async job ID. Check progress:
```
GET /api/v1/supervise/roster/checkautobuild/{autobuildid}
```

**Auto-Fill Shifts:**
```
POST /api/v1/supervise/roster/autofill
```

### 3.5 Timesheets (Clock In/Out, Hours Worked)

**Query Timesheets:**
```
POST /api/v1/resource/Timesheet/QUERY
{
  "search": {
    "s1": { "field": "StartTime", "data": 1651791600, "type": "gt" },
    "s2": { "field": "OperationalUnit", "data": 1, "type": "eq" }
  },
  "join": ["EmployeeObject", "OperationalUnitObject"]
}
```

Key fields: `Id`, `Employee`, `Date`, `StartTime`, `EndTime` (unix), `TotalTime` (hours), `Cost`, `Mealbreak`, `MealbreakSlots`, `Roster` (linked shift ID), `IsInProgress`, `TimeApproved`, `PayRuleApproved`, `IsLeave`, `Discarded`, `PayStaged`, `RealTime`

**Clock In:**
```
POST /api/v1/supervise/timesheet/start
{ "intEmployeeId": 3, "intOpunitId": 1 }
```

**Clock Out:**
```
POST /api/v1/supervise/timesheet/end
{ "intTimesheetId": 3, "intMealbreakMinute": 30 }
```

**Pause/Break:**
```
POST /api/v1/supervise/timesheet/pause
{ "intTimesheetId": 12 }
```

**Approve Timesheet:**
```
POST /api/v1/supervise/timesheet/approve
{ "intTimesheetId": 12 }
```

**Discard Timesheet:**
```
POST /api/v1/supervise/timesheet/discard
{ "intTimesheetId": 12 }
```

**Update Timesheet:**
```
POST /api/v1/supervise/timesheet/update
```

**Get Timesheet Details:**
```
GET /api/v1/supervise/timesheet/{id}/details
```

### 3.6 Timesheet Pay / Labour Costs

```
POST /api/v1/resource/TimesheetPayReturn/QUERY
{
  "search": {
    "s1": { "field": "Created", "data": "2026-03-01%", "type": "gt" }
  },
  "join": ["TimesheetObject"]
}
```

Key fields: `Cost` (labour cost in currency), `Value` (duration in hours), `PayRule` (applied rule ID), `Overridden` (manager override flag)

The join with `TimesheetObject` combines pay data with full timesheet details in one response.

### 3.7 Leave / Time Off

```
GET  /api/v1/resource/Leave
GET  /api/v1/resource/Leave/{id}
POST /api/v1/resource/Leave/QUERY
POST /api/v1/resource/Leave/{id}         (update)
```

Key fields: `Employee`, `Company` (location), `DateStart`, `DateEnd`, `Days`, `TotalHours`, `Status`, `Comment`, `ApprovalComment`

**Leave Status Values:**
- 0 = Awaiting approval
- 1 = Approved
- 2 = Declined
- 3 = Cancelled
- 4 = Date only approved
- 5 = Pay approved

### 3.8 Employee Availability / Unavailability

```
POST /api/v1/supervise/unavail
{
  "blnSubmitSuperUnavail": true,
  "intAssignedEmployeeId": 5,
  "start": { "timestamp": 1663084585 },
  "end": { "timestamp": 1663138617 },
  "strComment": "University lectures",
  "recurrence": {
    "FREQ": "WEEKLY",
    "INTERVAL": 1,
    "BYDAY": "MO,WE,FR"
  }
}
```

Recurrence options: `FREQ` (WEEKLY/MONTHLY), `INTERVAL`, `BYDAY` (MO,TU,WE,TH,FR,SA,SU), `BYMONTHDAY` (1-31).

### 3.9 Pay Rates

**List Pay Rate Awards:**
```
GET /api/v1/payroll/listAwardsLibrary
GET /api/v1/payroll/listAwardsLibrary/{AwardCode}
```

**Set Employee Pay Rate:**
```
POST /api/v1/supervise/employee/{employeeid}/setAwardFromLibrary
```

**Related Resources:**
```
POST /api/v1/resource/PayRules/QUERY
POST /api/v1/resource/EmployeeAgreement/QUERY
POST /api/v1/resource/EmploymentContract/QUERY
```

### 3.10 Sales / Metrics Data

```
POST /api/v2/metrics
POST /api/v2/metrics:bulk
```

Supports pushing actual sales, forecasts, and plans. Useful for feeding Lightspeed revenue data into Deputy for labour-vs-sales analysis.

Fields: `timestamp` (unix), `area` (OperationalUnit ID), `type` ("Sales", "Transactions", or custom), `reference`, `value`, `employee` (optional), `location` (Company ID)

### 3.11 Geo / Clock Location Data

```
GET /api/v1/resource/Geo
POST /api/v1/resource/Geo/QUERY
```

Records latitude, longitude, and address for timesheet events (start, end, pause). Useful for verifying employees clocked in at the correct location.

---

## 4. Webhooks

Deputy supports webhooks for real-time event notifications, eliminating the need to poll for changes.

### Setup

**Via API:**
```
POST /api/v1/resource/Webhook
{
  "Topic": "Timesheet",
  "Type": "URL",
  "Address": "https://your-endpoint.com/webhook",
  "Enabled": 1,
  "Headers": "Authorization: Bearer xxx",
  "Filters": "EmployeeId: 1"
}
```

**Manual Setup URL:**
```
https://c4cae802074915.uk.deputy.com/exec/devapp/webhooks
```

### Available Webhook Topics

| Topic | Description |
|-------|-------------|
| Company | Location/business changes |
| Comment | Comments on items |
| Employee | Employee record changes |
| EmployeeAvailability | Availability updates |
| Leave | Leave request changes |
| Memo | News feed posts |
| OperationalUnit | Area changes |
| Roster | Shift/schedule changes |
| RosterOpen | Open shift changes |
| RosterSwap | Shift swap changes |
| Roster.Publish | Schedule publication events |
| Task | Task changes |
| Timesheets | Timesheet changes |
| TimesheetPayReturn | Pay approval changes |
| TrainingRecord | Training assignment changes |
| User.Login | Login events |
| TimesheetExport.Begin | Export start |
| TimesheetExport.End | Export completion |
| Device.Registration | Kiosk/mobile device registration |

Each topic supports four trigger types: **Insert, Update, Delete, Save**.

### Webhook Payload

```json
{
  "topic": "Timesheet",
  "data": { ... }
}
```

### Webhook Headers (sent by Deputy)

| Header | Purpose |
|--------|---------|
| `X-Deputy-Secret` | SHA256 HMAC checksum (Enterprise only) |
| `X-Deputy-Webhook-Callback` | Resource URL of the webhook |
| `X-Deputy-Generation-Time` | Unix timestamp of when sent |

### Delivery Methods
- HTTP/HTTPS URL
- AWS SQS queue
- Slack

### Key Notes
- No limit on number of webhooks per install
- Disabled webhooks **lose events** while disabled (no replay)
- Filters can be applied server-side to reduce noise
- Timesheets fire at 4 stages: clock-on, clock-off, manager approval, pay approval

---

## 5. SDKs & Libraries

### Official SDK

**There is no official Deputy Node.js SDK.** The `deputy` npm package is an unrelated caching utility.

### Third-Party Libraries

| Library | Language | Notes |
|---------|----------|-------|
| [communityds/deputy-api-wrapper](https://github.com/communityds/deputy-api-wrapper) | PHP | Community wrapper with query builder, pagination handling |
| [tonyallan/deputy](https://github.com/tonyallan/deputy) | Python | Reporting and utility scripts |
| Airbyte Connector | Python | Read-only connector for 13 Deputy streams |
| Pipedream | Node.js | Low-code integration platform with Deputy support |

### Recommended Approach for IAGTM

Build a custom Node.js client similar to `services/lightspeed/lightspeed-client.js`. The Deputy API is straightforward REST/JSON with Bearer token auth, requiring no SDK. A thin wrapper around `fetch()` is sufficient.

---

## 6. Complete Resource API Object List (77 objects)

For reference, all resource objects available via `/api/v1/resource/{ObjectName}/`:

**Core HR:** Employee, EmployeeAgreement, EmployeeAgreementHistory, EmployeeAppraisal, EmployeeAvailability, EmployeeHistory, EmployeePaycycle, EmployeePaycycleReturn, EmployeeRole, EmployeeSalaryOpunitCosting, EmployeeWorkplace, EmploymentCondition, EmploymentContract, EmploymentContractLeaveRules

**Scheduling:** Roster, RosterOpen, RosterSwap, Shift, Schedule, Event, Team

**Time & Pay:** Timesheet, TimesheetPayReturn, Leave, LeaveAccrual, LeavePayLine, LeaveRules, PayPeriod, PayRules, Journal

**Location:** Company, CompanyPeriod, OperationalUnit (Area), Address, Contact, Geo, State, Country

**Sales:** SalesData, StressProfile

**Custom:** CustomField, CustomFieldData, CustomAppData, Category, Comment

**Tasks:** Task, TaskGroup, TaskGroupSetup, TaskOpunitConfig, TaskSetup

**Training:** TrainingModule, TrainingRecord

**System:** Kiosk, Webhook, SystemUsageBalance, SystemUsageTracking, PublicHoliday, SmsLog, Memo

---

## 7. Key Considerations for IAGTM Implementation

### Multi-Location Support

Deputy handles multi-location natively. The hierarchy is:
```
Install (c4cae802074915.uk.deputy.com)
  -> Company (Location): e.g., "Paddington", "Soho", "Chiswick"
     -> OperationalUnit (Area): e.g., "FOH", "BOH", "BOH Assistant"
```

Filter by location using `Company` field on most resources, or by `OperationalUnit` for area-level granularity.

### Practical Implementation Notes

1. **Permanent token is the way to go.** A single admin-generated token provides full API access. No refresh logic needed. Store in `.env` alongside Lightspeed credentials.

2. **500-record limit per query.** For timesheets and rosters, always filter by date range to stay under this limit. A week's worth of data for 7 locations should be well under 500.

3. **Unix timestamps everywhere.** StartTime and EndTime on Roster and Timesheet are unix epoch integers. The `Date` field is a human-readable date string.

4. **Labour cost data is split across two resources.** `Timesheet.Cost` gives the basic cost. `TimesheetPayReturn` gives the detailed breakdown with pay rules applied. Join them for complete labour cost analysis.

5. **Sales data integration opportunity.** Push Lightspeed revenue data into Deputy via `/api/v2/metrics` to enable Deputy's built-in labour-vs-sales analysis (Business Insights). This could be automated via n8n.

6. **Webhook support for n8n.** Deputy webhooks can POST to n8n webhook endpoints for real-time automation (e.g., notify when someone clocks in late, when a shift swap is requested, when timesheets are approved).

7. **No bulk operations on management endpoints** (except sales data). For bulk employee updates, use the Resource API or iterate with individual calls.

8. **Timesheet approval workflow.** Timesheets go through stages: In Progress -> Pending (clocked out) -> Time Approved -> Pay Approved -> Exported. Each stage is a separate API field.

### What This Replaces

| Current (Browser) | API Replacement |
|-------------------|----------------|
| Navigate to `#/roster` and scrape schedule | `POST /api/v1/resource/Roster/QUERY` with date filter |
| Navigate to `#/approve-v2` for timesheets | `POST /api/v1/resource/Timesheet/QUERY` + `TimesheetPayReturn/QUERY` |
| Read employee list from `#/team` | `GET /api/management/v2/employees` |
| Check locations at `#/locations` | `GET /api/v1/resource/Company` + `GET /api/v1/resource/OperationalUnit` |
| View labour costs on screen | `POST /api/v1/resource/TimesheetPayReturn/QUERY` with joins |

### Environment Variables Needed

```env
DEPUTY_INSTALL=c4cae802074915
DEPUTY_GEO=uk
DEPUTY_TOKEN=<permanent-token-from-setup>
DEPUTY_API_BASE=https://c4cae802074915.uk.deputy.com
```

### Status Monitoring

Deputy system status is tracked at: https://status.deputy.com

### API Support

For technical questions: apisupport@deputy.com

---

## 8. Next Steps

1. **Generate a permanent token** by navigating to `https://c4cae802074915.uk.deputy.com/exec/devapp/oauth_clients` while logged in as admin
2. **Test the token** with `GET /api/v1/me`
3. **Map location IDs** by querying `GET /api/v1/resource/Company` and `GET /api/v1/resource/OperationalUnit` to get the IDs for all 7 IAGTM locations and their areas
4. **Build the client** at `services/deputy/deputy-client.js` following the Lightspeed pattern
5. **Update the `iagtm-staff-scheduler` skill** to reference API endpoints as primary access method (same as was done for `iagtm-finance` with Lightspeed)
6. **Set up webhooks** for key events (timesheet changes, shift swaps) pointing to n8n

---

## Sources

- [Deputy Developer Portal](https://developer.deputy.com/)
- [Authenticating with Deputy](https://developer.deputy.com/docs/authenticating-with-deputy)
- [Using OAuth 2.0](https://developer.deputy.com/docs/using-oauth-20)
- [The Hello World of Deputy](https://developer.deputy.com/docs/the-hello-world-of-deputy)
- [Resource API Overview](https://developer.deputy.com/docs/resource-api-objects)
- [Public API Facts and Overview](https://developer.deputy.com/docs/public-api-facts-and-overview)
- [Getting Shifts](https://developer.deputy.com/docs/getting-shifts)
- [Adding/Updating a Shift](https://developer.deputy.com/docs/adding-a-shift)
- [Roster Resource](https://developer.deputy.com/docs/roster)
- [Timesheet Resource](https://developer.deputy.com/docs/timesheet)
- [Timesheet Management Calls](https://developer.deputy.com/docs/timesheet-management-calls)
- [Starting/Stopping Timesheets](https://developer.deputy.com/docs/startingstopping-timesheets-clock-in-and-out)
- [Retrieving Timesheets](https://developer.deputy.com/docs/retrieving-timesheets-from-deputy)
- [Adding an Employee](https://developer.deputy.com/docs/adding-an-employee)
- [Retrieving an Employee](https://developer.deputy.com/docs/new-employee-api-beta)
- [Location (Company)](https://developer.deputy.com/docs/company)
- [Area (OperationalUnit)](https://developer.deputy.com/docs/operational-unit-1)
- [Leave Resource](https://developer.deputy.com/docs/leave)
- [Setting Employee Unavailability](https://developer.deputy.com/docs/setting-an-employees-availability)
- [Modifying Location Settings](https://developer.deputy.com/docs/modifying-location-settings)
- [Webhook Overview](https://developer.deputy.com/docs/webhook-overview)
- [Webhook Action List](https://developer.deputy.com/docs/webhook-action-list)
- [Webhook Resource](https://developer.deputy.com/docs/webhook)
- [Manually Adding Webhooks](https://developer.deputy.com/docs/manually-adding-webhooks-to-a-deputy)
- [Auto-Build Shifts](https://developer.deputy.com/docs/using-the-api-to-auto-buildfill-deputy-shifts)
- [Setting Pay Rates](https://developer.deputy.com/docs/setting-pay-rates-via-the-api)
- [Adding Sales Data](https://developer.deputy.com/docs/adding-bulk-sales-data-to-deputy)
- [Payroll Developers Guide](https://developer.deputy.com/docs/payrolldevelopers)
- [Provisioning API Security](https://developer.deputy.com/docs/provisioning-api-security-overview)
- [Airbyte Deputy Connector](https://docs.airbyte.com/integrations/sources/deputy)
- [communityds/deputy-api-wrapper](https://github.com/communityds/deputy-api-wrapper)
