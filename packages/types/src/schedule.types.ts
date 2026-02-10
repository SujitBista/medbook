/**
 * Capacity-based schedule (window + maxPatients)
 * Replaces time-slot generation for booking.
 */

export interface Schedule {
  id: string;
  doctorId: string;
  date: Date; // DATE only
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxPatients: number;
  createdById?: string | null;
  createdAt: Date;
}

export interface CreateScheduleInput {
  doctorId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxPatients: number;
}

/** Reason code when the schedule window is not bookable (backend-derived) */
export type ScheduleDisabledReasonCode =
  | "FULL"
  | "PAST"
  | "PAYMENT_NOT_CONFIGURED"
  | "ROLE_FORBIDDEN";

export interface ScheduleWithCapacity extends Schedule {
  confirmedCount: number;
  remaining: number;
  /** Whether a patient can start booking (backend-derived) */
  isBookable: boolean;
  /** Human-readable reason when not bookable; empty when bookable */
  disabledReason: string;
  /** Machine code when not bookable; undefined when bookable */
  disabledReasonCode?: ScheduleDisabledReasonCode | null;
}

export interface GetSchedulesQuery {
  doctorId?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
}
