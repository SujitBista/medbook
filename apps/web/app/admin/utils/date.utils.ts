/**
 * Date utility functions for admin dashboard
 * Handles UTC to local time conversions for display in input fields
 */

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

/**
 * Converts a UTC date string/Date to local time Date object
 * This ensures proper timezone conversion when dates come from backend (UTC)
 */
export function utcToLocalDate(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  // If it's already a Date object from a UTC string, it's correctly parsed
  // getHours() and getMinutes() will return local time values
  return d;
}

/**
 * Formats a Date object to datetime-local input format (YYYY-MM-DDTHH:mm)
 * Converts UTC dates from backend to local time for display in input fields
 */
export function formatDateTimeLocal(date: Date | string): string {
  const d = utcToLocalDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  // getHours() and getMinutes() return local time values
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a Date object to date input format (YYYY-MM-DD)
 * Converts UTC dates from backend to local time for display
 */
export function formatDateLocal(date: Date | string): string {
  const d = utcToLocalDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats time for display in local timezone (12-hour format with AM/PM)
 * Converts UTC time from backend to local time for display
 */
export function formatTimeLocal(date: Date | string): string {
  const d = utcToLocalDate(date);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Converts a datetime-local input value (local time) to UTC Date
 * datetime-local inputs provide values in local time (e.g., "2024-01-15T14:30")
 * This function ensures they're properly converted to UTC when creating Date objects
 */
export function localToUtcDate(localDateTimeString: string): Date {
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  // When we create new Date() from this, JavaScript interprets it as local time
  // When serialized to JSON, it automatically converts to UTC (ISO string)
  return new Date(localDateTimeString);
}
