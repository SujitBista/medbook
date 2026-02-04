/**
 * Mappers between UI state and backend availability API.
 * Keeps API contracts unchanged; only shapes payloads for create/update.
 */

import type { Availability, CreateAvailabilityInput } from "@medbook/types";

/** Time range in HH:mm format (24h) */
export interface TimeRange {
  start: string; // e.g. "09:00"
  end: string; // e.g. "17:00"
}

/** Per-day weekly schedule (dayOfWeek 0-6, Sunday-Saturday) */
export interface DaySchedule {
  dayOfWeek: number;
  available: boolean;
  ranges: TimeRange[];
}

/** Weekly schedule UI state: 7 days */
export type WeeklySchedule = DaySchedule[];

/** Exception type for one-time overrides */
export type ExceptionType = "extra_availability" | "unavailable";

/** Exception form/UI state */
export interface ExceptionForm {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: ExceptionType;
  note?: string;
}

/** Parsed exception from API (one-time availability) */
export interface ParsedException extends ExceptionForm {
  id: string;
}

const DAYS_ORDERED = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/**
 * Create empty weekly schedule (Mon–Sun display order)
 */
export function createEmptyWeeklySchedule(): WeeklySchedule {
  return DAYS_ORDERED.map((d) => ({
    dayOfWeek: d.value,
    available: false,
    ranges: [],
  }));
}

/**
 * Parse HH:mm string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Check if two time ranges overlap (same day)
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Validate time range: end must be after start
 */
export function validateTimeRange(range: TimeRange): string | null {
  const startM = timeToMinutes(range.start);
  const endM = timeToMinutes(range.end);
  if (endM <= startM) return "End time must be after start time";
  return null;
}

/**
 * Validate all ranges in a day for overlaps
 */
export function validateDayRanges(ranges: TimeRange[]): string | null {
  for (let i = 0; i < ranges.length; i++) {
    const err = validateTimeRange(ranges[i]);
    if (err) return err;
    for (let j = i + 1; j < ranges.length; j++) {
      if (rangesOverlap(ranges[i], ranges[j])) {
        return "Time ranges overlap on this day";
      }
    }
  }
  return null;
}

/**
 * Build a Date with given date (YYYY-MM-DD) and time (HH:mm)
 */
function dateTimeFromDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(year!, month! - 1, day!, hours ?? 0, minutes ?? 0, 0, 0);
  return d;
}

/**
 * Build a Date for recurring: use anchor date + time (HH:mm).
 * Backend only uses the time portion for recurring schedules.
 */
function dateFromTimeOnly(timeStr: string, anchorDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(anchorDate);
  d.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return d;
}

/**
 * Split availabilities into recurring (weekly) and one-time (exceptions)
 */
export function availabilitiesToBuckets(availabilities: Availability[]): {
  recurring: Availability[];
  exceptions: Availability[];
} {
  const recurring: Availability[] = [];
  const exceptions: Availability[] = [];
  for (const a of availabilities) {
    if (a.isRecurring) recurring.push(a);
    else exceptions.push(a);
  }
  return { recurring, exceptions };
}

/**
 * Map recurring availabilities to weekly schedule UI state.
 * Groups by dayOfWeek and extracts time ranges from startTime/endTime.
 */
export function recurringToWeeklySchedule(
  recurring: Availability[]
): WeeklySchedule {
  const byDay = new Map<number, TimeRange[]>();
  for (const d of DAYS_ORDERED) {
    byDay.set(d.value, []);
  }

  for (const a of recurring) {
    const dow = a.dayOfWeek ?? 0;
    const start = new Date(a.startTime);
    const end = new Date(a.endTime);
    const startStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    const endStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
    const range: TimeRange = { start: startStr, end: endStr };
    const list = byDay.get(dow) ?? [];
    if (!list.some((r) => r.start === range.start && r.end === range.end)) {
      list.push(range);
      byDay.set(dow, list);
    }
  }

  return DAYS_ORDERED.map((d) => {
    const ranges = byDay.get(d.value) ?? [];
    return {
      dayOfWeek: d.value,
      available: ranges.length > 0,
      ranges,
    };
  });
}

/**
 * Map one-time availabilities to exception list for display.
 * Only "extra availability" is stored; "unavailable" would need a separate
 * API or we treat it as a different payload. The current API only has
 * availability slots, so "unavailable" = we don't create a slot (or we'd need
 * a different model). For now we map one-time availabilities as extra_availability.
 */
export function exceptionsToParsedList(
  exceptions: Availability[]
): ParsedException[] {
  return exceptions.map((a) => {
    const start = new Date(a.startTime);
    const end = new Date(a.endTime);
    const dateStr = start.toISOString().slice(0, 10);
    const startStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    const endStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
    return {
      id: a.id,
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      type: "extra_availability" as ExceptionType,
    };
  });
}

/**
 * Map weekly schedule UI state to CreateAvailabilityInput[].
 * One payload per (dayOfWeek, timeRange). Uses validFrom/validTo from options.
 */
export function weeklyScheduleToCreatePayloads(
  doctorId: string,
  schedule: WeeklySchedule,
  options: { validFrom?: string; validTo?: string }
): CreateAvailabilityInput[] {
  const anchor = new Date();
  const validFrom = options.validFrom
    ? new Date(options.validFrom + "T00:00:00")
    : new Date(
        anchor.getFullYear(),
        anchor.getMonth(),
        anchor.getDate(),
        0,
        0,
        0,
        0
      );
  const validTo = options.validTo
    ? new Date(options.validTo + "T23:59:59")
    : undefined;

  const payloads: CreateAvailabilityInput[] = [];
  for (const day of schedule) {
    if (!day.available || day.ranges.length === 0) continue;
    for (const range of day.ranges) {
      const startDate = dateFromTimeOnly(range.start, validFrom);
      const endDate = dateFromTimeOnly(range.end, validFrom);
      payloads.push({
        doctorId,
        startTime: startDate,
        endTime: endDate,
        dayOfWeek: day.dayOfWeek,
        isRecurring: true,
        validFrom,
        validTo,
      });
    }
  }
  return payloads;
}

/**
 * Map exception form to CreateAvailabilityInput (one-time).
 * Type "unavailable" is not supported by current API - we only create
 * extra_availability. Unavailable would require a separate endpoint.
 */
export function exceptionFormToCreatePayload(
  doctorId: string,
  form: ExceptionForm
): CreateAvailabilityInput | null {
  if (form.type === "unavailable") {
    return null;
  }
  const start = dateTimeFromDateAndTime(form.date, form.startTime);
  const end = dateTimeFromDateAndTime(form.date, form.endTime);
  return {
    doctorId,
    startTime: start,
    endTime: end,
    isRecurring: false,
  };
}

/**
 * Format time range for display (e.g. "10:00 AM – 1:00 PM")
 */
export function formatTimeRange(range: TimeRange): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const h12 = h! % 12 || 12;
    const ampm = h! < 12 ? "AM" : "PM";
    return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
  };
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

export { DAYS_ORDERED };
