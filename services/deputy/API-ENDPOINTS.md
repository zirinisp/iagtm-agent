# Deputy API Endpoints Reference

Tested 2026-03-06. Base URL configured via `DEPUTY_API_BASE` env var.
Authentication: `Bearer` token in `Authorization` header.

---

## Endpoint Summary

| Function | Method | Path | Status | Notes |
|----------|--------|------|--------|-------|
| `getMe()` | GET | `/v1/me` | Working | Current user info + permissions |
| `getLocations()` | GET | `/v1/resource/Company` | Working | All 12 Company objects |
| `getAreas()` | GET | `/v1/resource/OperationalUnit` | Working | All 28 areas |
| `getAreasForLocation(id)` | POST | `/v1/resource/OperationalUnit/QUERY` | Working | Filter by Company field |
| `getEmployees()` | GET | `/management/v2/employees` | Working | v2 API, returns active only (38), cursor pagination |
| `getEmployee(id)` | GET | `/v1/resource/Employee/{id}` | Working | Single employee, all fields |
| `resourceQuery('Employee', ...)` | POST | `/v1/resource/Employee/QUERY` | Working | All 257 employees (active + inactive) |
| `getRosters(start, end)` | POST | `/v1/resource/Roster/QUERY` | Working | Joined with Employee + Area |
| `getRosters(start, end, locationId)` | POST | `/v1/resource/Roster/QUERY` | **BUG** | Roster has no `Company` field; use `OperationalUnit` with `in` operator instead |
| `getTimesheets(start, end)` | POST | `/v1/resource/Timesheet/QUERY` | Working | Joined with Employee + Area |
| `getTimesheets(start, end, locationId)` | POST | `/v1/resource/Timesheet/QUERY` | **BUG** | Filters by `OperationalUnit` (area ID), not `Company` (location ID) |
| `getTimesheetPayData(start, end)` | POST | `/v1/resource/TimesheetPayReturn/QUERY` | Working | Pay rule costs; data exists but only for older timesheets |
| `getLeave(start, end)` | POST | `/v1/resource/Leave/QUERY` | **BUG** | Uses `DateStart` (ISO string) but search needs `Start` (unix timestamp) |

---

## Locations (Company Objects)

| ID | Code | CompanyName | Purpose |
|----|------|-------------|---------|
| 1 | PadBoh | 2. Paddington BOH | Paddington kitchen |
| 2 | CityRo | City Road | Legacy/inactive location |
| 3 | BAT | Battersea | Legacy/inactive location |
| 4 | REM | Remote | Remote/admin staff |
| 5 | SHR | 3. Shoreditch | Shoreditch kitchen |
| 6 | PadFoh | 1. Paddington FOH | Paddington front-of-house |
| 7 | BRT | 4. Brent | Brent kitchen |
| 8 | WAD | 5. Wandsworth | Wandsworth kitchen |
| 9 | PEC | 6. Peckham | Peckham kitchen |
| 10 | DPC_1P | Default Pay Centre | Payroll entity |
| 11 | TAL | Tallinn | Tallinn (Estonia) location |
| 12 | 7. | 7. Chiswick | Chiswick (newest location) |

Key Company fields: `Id`, `Code`, `Active`, `CompanyName`, `TradingName`, `IsWorkplace`, `IsPayrollEntity`, `Address`, `ParentCompany`, `Creator`, `Created`, `Modified`.

The `_DPMetaData` includes `AddressObject` (full address with street, city, postcode, country, lat/lon) and `Geo` (coordinates).

---

## Areas (OperationalUnit Objects)

| Area ID | Company ID | Location | Area Name |
|---------|-----------|----------|-----------|
| 5 | 1 | Paddington BOH | BOH |
| 9 | 1 | Paddington BOH | BOH Assistant |
| 22 | 1 | Paddington BOH | Deep Cleaning |
| 33 | 1 | Paddington BOH | Training |
| 18 | 4 | Remote | Management |
| 21 | 4 | Remote | Administration |
| 25 | 5 | Shoreditch | BOH |
| 35 | 5 | Shoreditch | BOH Assistant |
| 38 | 5 | Shoreditch | Training |
| 26 | 6 | Paddington FOH | Shopfloor |
| 27 | 6 | Paddington FOH | Dispatch/Tablet |
| 32 | 6 | Paddington FOH | FOH Training |
| 43 | 6 | Paddington FOH | Manager |
| 34 | 7 | Brent | BOH |
| 36 | 7 | Brent | BOH Assistant |
| 37 | 7 | Brent | Training |
| 40 | 8 | Wandsworth | BOH |
| 41 | 8 | Wandsworth | BOH Assistant |
| 42 | 8 | Wandsworth | Training |
| 48 | 9 | Peckham | BOH |
| 49 | 9 | Peckham | BOH Assistant |
| 50 | 9 | Peckham | Training |
| 51 | 9 | Peckham | The Blue Market |
| 52 | 11 | Tallinn | Cashier |
| 53 | 11 | Tallinn | Assistant Cook |
| 54 | 11 | Tallinn | Cook |
| 55 | 12 | Chiswick | BOH |
| 56 | 12 | Chiswick | BOH Assistant |

Key Area fields: `Id`, `Company`, `OperationalUnitName`, `Active`, `Colour`, `ShowOnRoster`, `RosterSortOrder`, `Address`, `WorkType`, `PayrollExportName`, `ParentOperationalUnit`.

---

## QUERY API Pattern

The Resource QUERY API is the primary way to search Deputy objects.

**Endpoint:** `POST /v1/resource/{ObjectName}/QUERY`

**Request body:**

```json
{
  "search": {
    "s1": { "field": "FieldName", "data": value, "type": "operator" },
    "s2": { "field": "AnotherField", "data": value, "type": "operator" }
  },
  "sort": { "FieldName": "asc" },
  "join": ["RelatedObject1", "RelatedObject2"],
  "start": 0,
  "max": 500
}
```

**Search operators:**
- `eq` — equals
- `ne` — not equals
- `ge` — greater than or equal
- `le` — less than or equal
- `gt` — greater than
- `lt` — less than
- `in` — value is an array, matches any (e.g., `{ "field": "OperationalUnit", "data": [26, 27, 32], "type": "in" }`)
- `lk` — like (string matching)

**Search keys** (`s1`, `s2`, etc.) are combined with AND logic.

**Join** appends related objects. Common patterns:
- `EmployeeObject` — full Employee record
- `OperationalUnitObject` — full Area record with Company info
- `TimesheetObject` — for TimesheetPayReturn joins

**Pagination:**
- `start` — offset (default 0)
- `max` — limit (default varies, use 500 for bulk queries)
- No built-in "total count" in response; if you get exactly `max` results, there may be more

---

## Endpoint Details

### getMe()
**GET** `/v1/me`

Returns the authenticated user's profile including:
- `Login`, `Name`, `FirstName`, `LastName`
- `Company` (ID) + `CompanyObject` (full location)
- `Portfolio` — organisation name ("It s All Greek to Me")
- `UserId`, `EmployeeId`, `PrimaryEmail`, `PrimaryPhone`
- `Permissions` — array of permission strings (ADMINISTRATOR, MANAGER, etc.)
- `JournalCategories` — staff log categories
- `InProgressTS` — currently active timesheet (null if none)
- `Pin` — kiosk PIN

### getLocations()
**GET** `/v1/resource/Company`

Returns all Company objects. See Locations table above.

### getAreas() / getAreasForLocation(id)
**GET** `/v1/resource/OperationalUnit` or **POST QUERY** with `Company` filter.

Areas include `CompanyCode`, `CompanyName`, `CompanyAddress` inline. The `_DPMetaData.AddressObject` has the full address.

### getEmployees() — v2 Management API
**GET** `/management/v2/employees`

Returns **only active employees** (38 at time of testing). Supports:
- `?fieldMask=firstName,lastName,displayName` — limit returned fields
- `?cursor=...` — cursor-based pagination

Response structure:
```json
{
  "success": true,
  "result": [
    { "data": { "firstName": "...", "lastName": "...", "displayName": "..." } }
  ],
  "nextCursor": null
}
```

**For all employees (active + inactive), use v1 QUERY instead:**
```js
resourceQuery('Employee', { max: 500 })  // returns 257 records
```

### getEmployee(id) — v1 Resource API
**GET** `/v1/resource/Employee/{id}`

Key fields: `Id`, `Company`, `FirstName`, `LastName`, `DisplayName`, `Active`, `StartDate`, `TerminationDate`, `Position`, `Role`, `DateOfBirth`, `Gender`, `Photo`, `UserId`, `Contact`, `EmergencyAddress`, `StressProfile`, `HistoryId`, `CustomFieldData`.

### getRosters(startDate, endDate, [locationId])
**POST** `/v1/resource/Roster/QUERY`

**BUG:** The `locationId` parameter filters by `Company` field, but Roster objects do NOT have a `Company` field. This returns a 400 error: `"Invalid search field Company"`.

**Workaround:** Filter by `OperationalUnit` using the `in` operator with area IDs for that location. Example for Paddington FOH (location 6, areas [26, 27, 32, 43]):
```js
resourceQuery('Roster', {
  search: {
    s1: { field: 'StartTime', data: toUnix(startDate), type: 'ge' },
    s2: { field: 'EndTime', data: toUnix(endDate), type: 'le' },
    s3: { field: 'OperationalUnit', data: [26, 27, 32, 43], type: 'in' },
  },
  sort: { StartTime: 'asc' },
  join: ['EmployeeObject', 'OperationalUnitObject'],
  max: 500,
});
```

Key Roster fields: `Id`, `Date`, `StartTime` (unix), `EndTime` (unix), `TotalTime` (hours as decimal), `Cost`, `OperationalUnit` (area ID), `Employee` (employee ID), `Comment`, `Published`, `Open`, `ConfirmStatus`, `SwapStatus`, `ShiftTemplate`, `StartTimeLocalized`, `EndTimeLocalized`, `OnCost`, `Mealbreak`.

With joins: `EmployeeObject` (full employee), `OperationalUnitObject` (full area with CompanyName).

`_DPMetaData` includes `OperationalUnitInfo` with `LabelWithCompany` (e.g., "[PadFoh] Manager") and `EmployeeInfo`.

### getTimesheets(startDate, endDate, [locationId])
**POST** `/v1/resource/Timesheet/QUERY`

**BUG (partial):** The `locationId` parameter filters by `OperationalUnit` field, which is an **area ID**, not a location ID. This works if you pass an area ID, but not if you pass a Company/location ID. To filter by location, use `in` with the area IDs for that location (same pattern as Rosters).

Key Timesheet fields: `Id`, `Employee`, `Date`, `StartTime` (unix), `EndTime` (unix), `TotalTime` (hours as decimal), `TotalTimeInv` (rounded hours), `Cost`, `OperationalUnit` (area ID), `Roster` (linked roster ID or null), `EmployeeComment`, `SupervisorComment`, `TimeApproved`, `Discarded`, `IsInProgress`, `IsLeave`, `LeaveId`, `PayRuleApproved`, `Exported`, `PaycycleId`, `RealTime`, `AutoProcessed`, `Mealbreak`, `MealbreakSlots`, `StartTimeLocalized`, `EndTimeLocalized`, `OnCost`, `ReviewState`, `Metadata` (JSON string with `forecast_cost`).

With joins: `EmployeeObject`, `OperationalUnitObject` (same as Roster).

### getTimesheetPayData(startDate, endDate)
**POST** `/v1/resource/TimesheetPayReturn/QUERY`

Filters by `Created` timestamp. Records exist but may be sparse — 0 records for recent dates in testing; older records from 2018 were found with no date filter.

Key fields: `Id`, `Timesheet` (timesheet ID), `PayRule` (pay rule ID), `Value` (hours), `Cost` (monetary cost), `Overridden`, `OverrideComment`, `IsToil`, `ToilValue`, `ToilMultiplier`.

With `TimesheetObject` join: includes the full Timesheet record.

**Note:** Labour cost data may be more reliably obtained from Timesheet records directly (the `Cost` and `OnCost` fields, plus `Metadata.forecast_cost`).

### getLeave(startDate, endDate)
**POST** `/v1/resource/Leave/QUERY`

**BUG:** Searches on `DateStart` field using unix timestamp, but `DateStart` is an ISO date string. The `Start` field is the unix timestamp. The query returns 0 results because of this mismatch.

**Fix:** Change the search field from `DateStart` to `Start`:
```js
search: {
  s1: { field: 'Start', data: toUnix(startDate), type: 'ge' },
  s2: { field: 'Start', data: toUnix(endDate), type: 'le' },
}
```

Total leave records in system: 345.

Key Leave fields: `Id`, `Employee`, `Company`, `LeaveRule`, `Start` (unix), `End` (unix), `DateStart` (ISO), `DateEnd` (ISO), `Days`, `TotalHours`, `Status` (1=approved), `Comment`, `ApprovalComment`, `AllDay`, `ApproverTime`, `ApproverPay`, `StartTimeLocalized`, `EndTimeLocalized`, `TimeZone`, `LeavePayLineArray` (array of daily pay lines with hours and cost).

---

## Bugs Found in deputy-client.js

### 1. getRosters — `Company` field does not exist on Roster
**Line 155:** `search.s3 = { field: 'Company', data: locationId, type: 'eq' };`

Roster objects have `OperationalUnit` (area ID), not `Company` (location ID). Fix: look up area IDs for the location first, then filter with `{ field: 'OperationalUnit', data: areaIds, type: 'in' }`.

### 2. getTimesheets — `OperationalUnit` filter takes area ID, not location ID
**Line 210:** `search.s3 = { field: 'OperationalUnit', data: locationId, type: 'eq' };`

The parameter is named `locationId` but the filter field is `OperationalUnit`, which expects an area ID. Same fix as Rosters: look up area IDs first, use `in` operator.

### 3. getLeave — wrong field name for date filter
**Lines 262-263:** Uses `DateStart` but should use `Start` for unix timestamp comparisons.

### 4. getTimesheetPayData — `Created` may not be the right filter field
The `Created` field reflects when the pay record was created, not when the shift occurred. For date-range queries, joining `TimesheetObject` and filtering on `TimesheetObject.StartTime` would be more accurate, but QUERY API may not support filtering on joined fields.

---

## Other API Patterns

### Direct Resource GET
`GET /v1/resource/{ObjectName}` — returns all records (no pagination, no filters). Works for small collections (Company, OperationalUnit). Returns up to default limit for large collections (Leave returned 345).

`GET /v1/resource/{ObjectName}/{id}` — returns a single record by ID.

### Supervise API (write operations)
- `POST /v1/supervise/roster` — create a roster/shift
- `POST /v1/supervise/roster/publish` — publish rosters with notification mode
- `POST /v1/supervise/timesheet/approve` — approve a timesheet

### v2 Management API
- `GET /management/v2/employees` — cursor-paginated, field masks, active employees only
- Response: `{ success, result: [{ data: {...} }], nextCursor }`

---

## Quick Reference: Location to Area IDs

To filter Rosters or Timesheets by location, use these area ID arrays:

```js
const LOCATION_AREAS = {
  1:  [5, 9, 22, 33],           // Paddington BOH
  4:  [18, 21],                  // Remote
  5:  [25, 35, 38],             // Shoreditch
  6:  [26, 27, 32, 43],         // Paddington FOH
  7:  [34, 36, 37],             // Brent
  8:  [40, 41, 42],             // Wandsworth
  9:  [48, 49, 50, 51],         // Peckham
  11: [52, 53, 54],             // Tallinn
  12: [55, 56],                  // Chiswick
};
```
