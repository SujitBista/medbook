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

export interface ScheduleWithCapacity extends Schedule {
  confirmedCount: number;
  remaining: number;
}

export interface GetSchedulesQuery {
  doctorId?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
}
