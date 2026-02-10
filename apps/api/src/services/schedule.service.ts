/**
 * Capacity-based schedule service
 * Handles schedule windows (date + startTime + endTime + maxPatients)
 */

import { query, withTransaction } from "@app/db";
import type {
  Schedule,
  CreateScheduleInput,
  ScheduleWithCapacity,
  ScheduleDisabledReasonCode,
} from "@medbook/types";
import { getCommissionSettingsByDoctorId } from "./commission.service";
import { isStripeConfigured } from "../config/stripe";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../utils/errors";
import { logger } from "../utils/logger";

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function parseTimeToMinutes(s: string): number {
  const m = s.trim().match(TIME_REGEX);
  if (!m) throw createValidationError(`Invalid time format: ${s}. Use HH:mm`);
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const aS = parseTimeToMinutes(aStart);
  const aE = parseTimeToMinutes(aEnd);
  const bS = parseTimeToMinutes(bStart);
  const bE = parseTimeToMinutes(bEnd);
  return aS < bE && aE > bS;
}

/**
 * Create a schedule window (capacity-based)
 * Rejects overlapping windows for the same doctor on the same date.
 */
export async function createSchedule(
  input: CreateScheduleInput,
  createdById?: string | null
): Promise<Schedule> {
  const { doctorId, date, startTime, endTime, maxPatients } = input;

  if (maxPatients < 1) {
    throw createValidationError("maxPatients must be at least 1");
  }

  const startM = parseTimeToMinutes(startTime);
  const endM = parseTimeToMinutes(endTime);
  if (startM >= endM) {
    throw createValidationError("startTime must be before endTime");
  }

  const dateOnly = new Date(date);
  if (isNaN(dateOnly.getTime())) {
    throw createValidationError("Invalid date format. Use YYYY-MM-DD");
  }
  dateOnly.setHours(0, 0, 0, 0);

  const existing = await query<
    { id: string; startTime: string; endTime: string }[]
  >((prisma) =>
    prisma.schedule.findMany({
      where: {
        doctorId,
        date: dateOnly,
      },
      select: { id: true, startTime: true, endTime: true },
    })
  );

  for (const ex of existing) {
    if (timesOverlap(startTime, endTime, ex.startTime, ex.endTime)) {
      logger.warn("Schedule overlap rejected", {
        doctorId,
        date,
        new: { startTime, endTime },
        existing: { startTime: ex.startTime, endTime: ex.endTime },
      });
      throw createConflictError(
        "This time window overlaps with an existing schedule for the same doctor on this date"
      );
    }
  }

  const schedule = await query<{
    id: string;
    doctorId: string;
    date: Date;
    startTime: string;
    endTime: string;
    maxPatients: number;
    createdById: string | null;
    createdAt: Date;
  }>((prisma) =>
    prisma.schedule.create({
      data: {
        doctorId,
        date: dateOnly,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        maxPatients,
        createdById: createdById ?? null,
      },
    })
  );

  logger.info("Schedule created", {
    event: "schedule-create",
    scheduleId: schedule.id,
    doctorId,
    date,
    startTime,
    endTime,
    maxPatients,
  });

  return {
    id: schedule.id,
    doctorId: schedule.doctorId,
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    maxPatients: schedule.maxPatients,
    createdById: schedule.createdById ?? undefined,
    createdAt: schedule.createdAt,
  };
}

/**
 * Get schedules (admin) with optional filters
 */
export async function getSchedules(queryInput: {
  doctorId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Schedule[]> {
  const where: { doctorId?: string; date?: object } = {};

  if (queryInput.doctorId) {
    where.doctorId = queryInput.doctorId;
  }

  if (queryInput.date) {
    const d = new Date(queryInput.date);
    d.setHours(0, 0, 0, 0);
    where.date = d;
  } else if (queryInput.startDate || queryInput.endDate) {
    const cond: { gte?: Date; lte?: Date } = {};
    if (queryInput.startDate) {
      const d = new Date(queryInput.startDate);
      d.setHours(0, 0, 0, 0);
      cond.gte = d;
    }
    if (queryInput.endDate) {
      const d = new Date(queryInput.endDate);
      d.setHours(23, 59, 59, 999);
      cond.lte = d;
    }
    if (Object.keys(cond).length) where.date = cond;
  }

  const rows = await query<
    {
      id: string;
      doctorId: string;
      date: Date;
      startTime: string;
      endTime: string;
      maxPatients: number;
      createdById: string | null;
      createdAt: Date;
    }[]
  >((prisma) =>
    prisma.schedule.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })
  );

  return rows.map((r) => ({
    id: r.id,
    doctorId: r.doctorId,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    maxPatients: r.maxPatients,
    createdById: r.createdById ?? undefined,
    createdAt: r.createdAt,
  }));
}

/**
 * Get schedule windows for a doctor on a date (single source of truth for UI).
 * Same data source as getAvailabilityWindows but returns plain schedules; use getAvailabilityWindows for remaining capacity.
 */
export async function getDoctorSchedules(
  doctorId: string,
  date: string
): Promise<Schedule[]> {
  return getSchedules({ doctorId, date });
}

/**
 * Returns the set of doctor IDs that have at least one schedule in the given date range.
 * Used for doctors list "has schedule" badge so list and booking page use the same logic (capacity-based).
 */
export async function getDoctorIdsWithScheduleInRange(
  doctorIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Set<string>> {
  if (doctorIds.length === 0) return new Set();
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const rows = await query<{ doctorId: string }[]>((prisma) =>
    prisma.schedule.findMany({
      where: {
        doctorId: { in: doctorIds },
        date: { gte: start, lte: end },
      },
      select: { doctorId: true },
      distinct: ["doctorId"],
    })
  );
  return new Set(rows.map((r) => r.doctorId));
}

/**
 * Get schedule by ID
 */
export async function getScheduleById(scheduleId: string): Promise<Schedule> {
  const row = await query<{
    id: string;
    doctorId: string;
    date: Date;
    startTime: string;
    endTime: string;
    maxPatients: number;
    createdById: string | null;
    createdAt: Date;
  } | null>((prisma) =>
    prisma.schedule.findUnique({
      where: { id: scheduleId },
    })
  );

  if (!row) {
    throw createNotFoundError("Schedule");
  }

  return {
    id: row.id,
    doctorId: row.doctorId,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    maxPatients: row.maxPatients,
    createdById: row.createdById ?? undefined,
    createdAt: row.createdAt,
  };
}

/**
 * Count CONFIRMED appointments for a schedule (excludes PENDING_PAYMENT, CANCELLED, OVERFLOW)
 */
export async function countConfirmedForSchedule(
  scheduleId: string
): Promise<number> {
  const result = await query<{ _count: { id: number } }>((prisma) =>
    prisma.appointment.aggregate({
      _count: { id: true },
      where: {
        scheduleId,
        status: "CONFIRMED",
      },
    })
  );
  return result._count.id;
}

function scheduleEndDateTime(schedule: { date: Date; endTime: string }): Date {
  const [endH, endM] = schedule.endTime.split(":").map(Number);
  const end = new Date(schedule.date);
  end.setHours(endH ?? 0, endM ?? 0, 0, 0);
  return end;
}

function disabledReasonMessage(code: ScheduleDisabledReasonCode): string {
  switch (code) {
    case "FULL":
      return "This window is full.";
    case "PAST":
      return "This window has already ended.";
    case "PAYMENT_NOT_CONFIGURED":
      return "Booking is unavailable (payment not configured).";
    case "ROLE_FORBIDDEN":
      return "You don't have permission to book.";
    default:
      return "";
  }
}

/**
 * Get availability windows for a doctor on a date (public)
 * Returns schedules with confirmedCount, remaining, isBookable, and disabledReason(Code)
 */
export async function getAvailabilityWindows(
  doctorId: string,
  date: string
): Promise<ScheduleWithCapacity[]> {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw createValidationError("Invalid date. Use YYYY-MM-DD");
  }
  d.setHours(0, 0, 0, 0);

  const schedules = await query<
    {
      id: string;
      doctorId: string;
      date: Date;
      startTime: string;
      endTime: string;
      maxPatients: number;
      createdById: string | null;
      createdAt: Date;
    }[]
  >((prisma) =>
    prisma.schedule.findMany({
      where: { doctorId, date: d },
      orderBy: { startTime: "asc" },
    })
  );

  const now = new Date();
  const commission = await getCommissionSettingsByDoctorId(doctorId);
  const appointmentPrice = commission?.appointmentPrice ?? 0;
  const paymentConfigured = isStripeConfigured() && appointmentPrice > 0;

  const out: ScheduleWithCapacity[] = [];

  for (const s of schedules) {
    const confirmedCount = await countConfirmedForSchedule(s.id);
    const remaining = Math.max(0, s.maxPatients - confirmedCount);
    const endAt = scheduleEndDateTime({ date: s.date, endTime: s.endTime });
    const isPast = endAt <= now;

    let disabledReasonCode: ScheduleDisabledReasonCode | null = null;
    if (isPast) {
      disabledReasonCode = "PAST";
    } else if (remaining <= 0) {
      disabledReasonCode = "FULL";
    } else if (!paymentConfigured) {
      disabledReasonCode = "PAYMENT_NOT_CONFIGURED";
    }

    const isBookable = !disabledReasonCode;
    out.push({
      id: s.id,
      doctorId: s.doctorId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      maxPatients: s.maxPatients,
      createdById: s.createdById ?? undefined,
      createdAt: s.createdAt,
      confirmedCount,
      remaining,
      isBookable,
      disabledReason: disabledReasonCode
        ? disabledReasonMessage(disabledReasonCode)
        : "",
      disabledReasonCode: disabledReasonCode ?? undefined,
    });
  }

  return out;
}
