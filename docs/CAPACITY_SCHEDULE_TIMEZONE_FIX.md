# Capacity Schedule Timezone Bug – Fix Summary

## The Bug

Capacity schedules were saved and displayed as full DateTime values (e.g. `2026-02-10T00:00:00.000Z`), and the "upcoming" logic used **UTC** for "today" and for "schedule end time". This caused the public "Find Your Doctor" page to show "No doctors found" when:

1. **UTC vs local date mismatch**: For clinics in timezones behind UTC (e.g. PST), when it was still Feb 9 locally, UTC might already be Feb 10. We compared `schedule.date >= todayUTC`, so a schedule for Feb 9 (local) was excluded because `todayUTC` was Feb 10.

2. **Wrong end-time interpretation**: `scheduleEndDateTimeUTC` treated `startTime`/`endTime` (e.g. `"09:00"`–`"12:00"`) as UTC. Those times are **local clinic times**. Interpreting them as UTC caused schedules to be marked as "ended" too early or too late.

3. **Date normalization on create**: Using `new Date("2026-02-10").setHours(0,0,0,0)` runs `setHours` in the server’s **local** timezone. In a timezone ahead of UTC (e.g. Nepal), that shifted the stored date backward by one day.

## Why DATE Fixes It

- `schedule.date` is stored as PostgreSQL `DATE` (calendar date only, no timezone).
- The semantics are: _calendar date_ + _local time range_ (`startTime`/`endTime`).
- Comparisons must use the server’s **local** date for "today" and local time for "has this window ended?", so behavior matches the clinic’s timezone.

## Changes Made

### 1. Backend (`schedule.service.ts`)

- **`todayLocalForDb()`**: Replaces `todayUTC()`. Uses server local date (YYYY-MM-DD) and builds `new Date(todayStr + 'T00:00:00.000Z')` for DB comparisons.
- **`scheduleEndDateTimeLocal()`**: Replaces `scheduleEndDateTimeUTC()`. Constructs end datetime as `new Date(year, month, date, endH, endM, 0, 0)` from the schedule’s date parts and `endTime`, in local time.
- **`createSchedule`**: Normalizes date with `new Date(dateStr + 'T00:00:00.000Z')` to avoid timezone shifts when persisting.
- **`getSchedules` / `getDoctorSchedules` / `getAvailabilityWindows`**: Use strict YYYY-MM-DD parsing and the same date normalization for filters.

### 2. Frontend

- **Admin capacity schedule list**: Displays dates as `YYYY-MM-DD • HH:mm–HH:mm • max N` instead of ISO timestamps.
- **Public doctors page**: Continues to use `nextScheduleDate` (YYYY-MM-DD) and `formatScheduleDate` for display.
- **Booking page**: Uses `/api/availability/upcoming-dates` for the default date, which now uses local date/time logic.

### 3. Schema

- Prisma already defines `date DateTime @db.Date` for `Schedule`, mapping to PostgreSQL `DATE`. No schema change required.

## Verification

1. Create a schedule for tomorrow.
2. Public `/doctors` (with "Show all doctors" unchecked) shows the doctor.
3. Booking page defaults to the earliest upcoming schedule date.
4. Admin schedule list shows dates like `2026-02-10 • 09:00–12:00 • max 15` instead of ISO strings.
