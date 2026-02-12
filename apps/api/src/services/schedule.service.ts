/**
 * Capacity-based schedule service
 * Handles schedule windows (date + startTime + endTime + maxPatients)
 */

import { query } from "@app/db";
import type {
  Schedule,
  CreateScheduleInput,
  UpdateScheduleInput,
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

  // Store as pure DATE: parse YYYY-MM-DD and normalize to UTC midnight
  // to avoid timezone shifts (e.g. new Date("2026-02-10").setHours in local TZ)
  const match = String(date)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw createValidationError("Invalid date format. Use YYYY-MM-DD");
  }
  const dateOnly = new Date(
    `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`
  );
  if (isNaN(dateOnly.getTime())) {
    throw createValidationError("Invalid date format. Use YYYY-MM-DD");
  }

  // Reject past date/time: schedule end (date + endTime in local time) must be in the future
  const endMinutes = parseTimeToMinutes(endTime);
  const scheduleEndLocal = new Date(
    dateOnly.getUTCFullYear(),
    dateOnly.getUTCMonth(),
    dateOnly.getUTCDate(),
    Math.floor(endMinutes / 60),
    endMinutes % 60,
    0,
    0
  );
  if (scheduleEndLocal <= new Date()) {
    throw createValidationError(
      "Cannot create a capacity schedule for a past date or time. The schedule end must be in the future."
    );
  }

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
 * Update a schedule window (capacity-based).
 * Rejects overlapping windows for the same doctor on the same date (excluding this schedule).
 * Rejects past date/time.
 */
export async function updateSchedule(
  scheduleId: string,
  input: UpdateScheduleInput
): Promise<Schedule> {
  const existing = await getScheduleById(scheduleId);
  const { date, startTime, endTime, maxPatients } = input;

  if (maxPatients < 1) {
    throw createValidationError("maxPatients must be at least 1");
  }

  const startM = parseTimeToMinutes(startTime);
  const endM = parseTimeToMinutes(endTime);
  if (startM >= endM) {
    throw createValidationError("startTime must be before endTime");
  }

  const match = String(date)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw createValidationError("Invalid date format. Use YYYY-MM-DD");
  }
  const dateOnly = new Date(
    `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`
  );
  if (isNaN(dateOnly.getTime())) {
    throw createValidationError("Invalid date format. Use YYYY-MM-DD");
  }

  const endMinutes = parseTimeToMinutes(endTime);
  const scheduleEndLocal = new Date(
    dateOnly.getUTCFullYear(),
    dateOnly.getUTCMonth(),
    dateOnly.getUTCDate(),
    Math.floor(endMinutes / 60),
    endMinutes % 60,
    0,
    0
  );
  if (scheduleEndLocal <= new Date()) {
    throw createValidationError(
      "Cannot set a capacity schedule to a past date or time. The schedule end must be in the future."
    );
  }

  const others = await query<
    { id: string; startTime: string; endTime: string }[]
  >((prisma) =>
    prisma.schedule.findMany({
      where: {
        doctorId: existing.doctorId,
        date: dateOnly,
        id: { not: scheduleId },
      },
      select: { id: true, startTime: true, endTime: true },
    })
  );

  for (const ex of others) {
    if (timesOverlap(startTime, endTime, ex.startTime, ex.endTime)) {
      logger.warn("Schedule overlap rejected (update)", {
        scheduleId,
        doctorId: existing.doctorId,
        date,
        new: { startTime, endTime },
        existing: { startTime: ex.startTime, endTime: ex.endTime },
      });
      throw createConflictError(
        "This time window overlaps with an existing schedule for the same doctor on this date"
      );
    }
  }

  const updated = await query<{
    id: string;
    doctorId: string;
    date: Date;
    startTime: string;
    endTime: string;
    maxPatients: number;
    createdById: string | null;
    createdAt: Date;
  }>((prisma) =>
    prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        date: dateOnly,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        maxPatients,
      },
    })
  );

  logger.info("Schedule updated", {
    event: "schedule-update",
    scheduleId: updated.id,
    doctorId: updated.doctorId,
    date,
    startTime,
    endTime,
    maxPatients,
  });

  return {
    id: updated.id,
    doctorId: updated.doctorId,
    date: updated.date,
    startTime: updated.startTime,
    endTime: updated.endTime,
    maxPatients: updated.maxPatients,
    createdById: updated.createdById ?? undefined,
    createdAt: updated.createdAt,
  };
}

/**
 * Delete a capacity schedule by ID.
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const existing = await getScheduleById(scheduleId);
  await query((prisma) =>
    prisma.schedule.delete({ where: { id: scheduleId } })
  );
  logger.info("Schedule deleted", {
    event: "schedule-delete",
    scheduleId,
    doctorId: existing.doctorId,
  });
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
    const m = String(queryInput.date)
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) where.date = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  } else if (queryInput.startDate || queryInput.endDate) {
    const cond: { gte?: Date; lte?: Date } = {};
    if (queryInput.startDate) {
      const m = String(queryInput.startDate)
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) cond.gte = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
    }
    if (queryInput.endDate) {
      const m = String(queryInput.endDate)
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) cond.lte = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
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
  const m = String(date)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return [];
  return getSchedules({ doctorId, date: `${m[1]}-${m[2]}-${m[3]}` });
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
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  const start = new Date(`${startStr}T00:00:00.000Z`);
  const end = new Date(`${endStr}T00:00:00.000Z`);
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
 * Today's calendar date (YYYY-MM-DD) in server's local timezone, as a Date for DB comparison.
 * schedule.date is stored as DATE; we compare against local "today" so clinics in any timezone
 * see correct upcoming schedules (fixes "No doctors found" when UTC today != local today).
 */
function todayLocalForDb(): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

/**
 * End datetime of a schedule in server's local timezone.
 * schedule.date (DATE) comes from DB as UTC midnight; endTime (HH:mm) is local clinic time.
 * Uses local date + local time for "has the window ended?" so timezone doesn't wrongly exclude today's slots.
 */
function scheduleEndDateTimeLocal(schedule: {
  date: Date;
  endTime: string;
}): Date {
  const [endH, endM] = schedule.endTime.split(":").map(Number);
  const y = schedule.date.getUTCFullYear();
  const m = schedule.date.getUTCMonth();
  const d = schedule.date.getUTCDate();
  return new Date(y, m, d, endH ?? 0, endM ?? 0, 0, 0);
}

/**
 * Returns doctor IDs that have at least one capacity schedule window that has not yet ended.
 * Upcoming = schedule.date > todayLocal OR (schedule.date === todayLocal AND endTime > now).
 * Uses local date/time so clinics in any timezone see correct results.
 */
export async function getDoctorIdsWithFutureSchedule(): Promise<Set<string>> {
  const now = new Date();
  const today = todayLocalForDb();
  const rows = await query<{ doctorId: string; date: Date; endTime: string }[]>(
    (prisma) =>
      prisma.schedule.findMany({
        where: { date: { gte: today } },
        select: { doctorId: true, date: true, endTime: true },
      })
  );
  const doctorIds = new Set<string>();
  for (const row of rows) {
    const endAt = scheduleEndDateTimeLocal({
      date: row.date,
      endTime: row.endTime,
    });
    if (endAt > now) doctorIds.add(row.doctorId);
  }
  return doctorIds;
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

/** Same as scheduleEndDateTimeLocal: date + endTime as local time for "has ended?" check. */
function scheduleEndDateTime(schedule: { date: Date; endTime: string }): Date {
  return scheduleEndDateTimeLocal(schedule);
}

export interface NextUpcomingSchedule {
  date: Date;
  startTime: string;
  endTime: string;
  remaining: number;
  scheduleId: string;
}

/**
 * Returns the next upcoming capacity schedule per doctor (earliest by date then startTime).
 * Used for doctors list "Next available" and for default booking date.
 * Uses local date/time for correct timezone handling.
 */
export async function getNextUpcomingScheduleByDoctorIds(
  doctorIds: string[]
): Promise<Map<string, NextUpcomingSchedule>> {
  if (doctorIds.length === 0) return new Map();
  const now = new Date();
  const today = todayLocalForDb();

  const rows = await query<
    {
      id: string;
      doctorId: string;
      date: Date;
      startTime: string;
      endTime: string;
      maxPatients: number;
    }[]
  >((prisma) =>
    prisma.schedule.findMany({
      where: { doctorId: { in: doctorIds }, date: { gte: today } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })
  );

  const result = new Map<string, NextUpcomingSchedule>();
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.doctorId)) continue;
    const endAt = scheduleEndDateTimeLocal({
      date: row.date,
      endTime: row.endTime,
    });
    if (endAt <= now) continue;
    const confirmedCount = await countConfirmedForSchedule(row.id);
    const remaining = Math.max(0, row.maxPatients - confirmedCount);
    seen.add(row.doctorId);
    result.set(row.doctorId, {
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      remaining,
      scheduleId: row.id,
    });
  }
  return result;
}

/**
 * Returns distinct schedule dates (YYYY-MM-DD) for a doctor that have at least one
 * upcoming (not yet ended) window. Used to default the booking page date picker.
 */
export async function getUpcomingScheduleDates(
  doctorId: string
): Promise<string[]> {
  const now = new Date();
  const today = todayLocalForDb();

  const rows = await query<{ date: Date; endTime: string }[]>((prisma) =>
    prisma.schedule.findMany({
      where: { doctorId, date: { gte: today } },
      select: { date: true, endTime: true },
      orderBy: { date: "asc" },
    })
  );

  const dates: string[] = [];
  let lastDate = "";

  for (const row of rows) {
    const endAt = scheduleEndDateTimeLocal({
      date: row.date,
      endTime: row.endTime,
    });
    if (endAt <= now) continue;
    const dateStr = row.date.toISOString().slice(0, 10);
    if (dateStr !== lastDate) {
      dates.push(dateStr);
      lastDate = dateStr;
    }
  }
  return dates;
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
  const m = String(date)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    throw createValidationError("Invalid date. Use YYYY-MM-DD");
  }
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  if (isNaN(d.getTime())) {
    throw createValidationError("Invalid date. Use YYYY-MM-DD");
  }

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
