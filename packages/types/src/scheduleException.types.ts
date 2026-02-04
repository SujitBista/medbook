/**
 * Schedule exception types
 * One-time scheduling exceptions: holiday/closure (unavailable) or extra hours (available)
 */

export const ScheduleExceptionType = {
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type ScheduleExceptionType =
  (typeof ScheduleExceptionType)[keyof typeof ScheduleExceptionType];

export const ScheduleExceptionReason = {
  HOLIDAY: "HOLIDAY",
  LEAVE: "LEAVE",
  EXTRA_HOURS: "EXTRA_HOURS",
} as const;

export type ScheduleExceptionReason =
  (typeof ScheduleExceptionReason)[keyof typeof ScheduleExceptionReason];

export interface ScheduleException {
  id: string;
  doctorId: string | null;
  dateFrom: Date;
  dateTo: Date;
  startTime: string | null;
  endTime: string | null;
  type: ScheduleExceptionType;
  reason: string;
  label: string | null;
  createdById: string;
  createdAt: Date;
}

export type ScheduleExceptionScope = "ALL_DOCTORS" | "SELECTED_DOCTORS";

export interface CreateScheduleExceptionInput {
  scope: ScheduleExceptionScope;
  doctorIds?: string[];
  dateFrom: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD, optional for single date
  isFullDay?: boolean;
  startTime?: string | null; // HH:mm
  endTime?: string | null; // HH:mm
  type: ScheduleExceptionType;
  reason: string; // HOLIDAY, EXTRA_HOURS, etc.
  label?: string | null;
}
