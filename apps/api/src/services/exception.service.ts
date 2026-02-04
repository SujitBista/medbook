/**
 * Schedule exception service functions
 * Handles one-time scheduling exceptions: holiday/closure (unavailable) and extra hours (available)
 */

import { query, Prisma } from "@app/db";
import {
  ScheduleException,
  ScheduleExceptionType,
  CreateScheduleExceptionInput,
} from "@medbook/types";
import { createNotFoundError, createValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

/** Inclusive day count between two YYYY-MM-DD dates */
export function countDaysInclusive(dateFrom: string, dateTo: string): number {
  const [y1, m1, d1] = dateFrom.split("-").map(Number);
  const [y2, m2, d2] = dateTo.split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
  const diff = Math.round(
    (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  return diff + 1;
}

/** Validate endTime > startTime (HH:mm) */
export function validateTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): void {
  if (startTime == null || endTime == null) return;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startM = (sh ?? 0) * 60 + (sm ?? 0);
  const endM = (eh ?? 0) * 60 + (em ?? 0);
  if (endM <= startM) {
    throw createValidationError("End time must be after start time");
  }
}

function toScheduleException(row: {
  id: string;
  doctorId: string | null;
  dateFrom: Date;
  dateTo: Date;
  startTime: string | null;
  endTime: string | null;
  type: string;
  reason: string;
  label: string | null;
  createdById: string;
  createdAt: Date;
}): ScheduleException {
  return {
    id: row.id,
    doctorId: row.doctorId,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    startTime: row.startTime,
    endTime: row.endTime,
    type: row.type as ScheduleExceptionType,
    reason: row.reason,
    label: row.label,
    createdById: row.createdById,
    createdAt: row.createdAt,
  };
}

/**
 * Creates one or more schedule exceptions (one per doctor when scope is SELECTED_DOCTORS)
 */
export async function createScheduleException(
  input: CreateScheduleExceptionInput,
  createdById: string
): Promise<ScheduleException[]> {
  const {
    scope,
    doctorIds,
    dateFrom,
    dateTo: dateToInput,
    isFullDay,
    startTime,
    endTime,
    type,
    reason,
    label,
  } = input;

  const dateTo = dateToInput ?? dateFrom;
  if (dateTo < dateFrom) {
    throw createValidationError("End date must be on or after start date");
  }

  if (scope === "SELECTED_DOCTORS") {
    if (!doctorIds?.length) {
      throw createValidationError("At least one doctor must be selected");
    }
  }

  if (type === ScheduleExceptionType.UNAVAILABLE) {
    if (!isFullDay && (startTime == null || endTime == null)) {
      throw createValidationError(
        "Partial closure requires start time and end time"
      );
    }
    validateTimeRange(startTime, endTime);
  } else {
    // AVAILABLE (extra hours): startTime and endTime required
    if (!startTime || !endTime) {
      throw createValidationError(
        "Extra hours require start time and end time"
      );
    }
    validateTimeRange(startTime, endTime);
  }

  const dateFromDate = new Date(dateFrom + "T00:00:00");
  const dateToDate = new Date(dateTo + "T23:59:59.999");
  const startTimeVal =
    isFullDay !== false && type === ScheduleExceptionType.UNAVAILABLE
      ? null
      : (startTime ?? null);
  const endTimeVal =
    isFullDay !== false && type === ScheduleExceptionType.UNAVAILABLE
      ? null
      : (endTime ?? null);

  const doctorIdsToCreate: (string | null)[] =
    scope === "ALL_DOCTORS" ? [null] : doctorIds!.map((id) => id);

  const created: ScheduleException[] = [];

  for (const doctorId of doctorIdsToCreate) {
    const row = await query<{
      id: string;
      doctorId: string | null;
      dateFrom: Date;
      dateTo: Date;
      startTime: string | null;
      endTime: string | null;
      type: string;
      reason: string;
      label: string | null;
      createdById: string;
      createdAt: Date;
    }>((prisma) =>
      prisma.scheduleException.create({
        data: {
          doctorId,
          dateFrom: dateFromDate,
          dateTo: dateToDate,
          startTime: startTimeVal,
          endTime: endTimeVal,
          type,
          reason:
            reason ??
            (type === ScheduleExceptionType.UNAVAILABLE
              ? "HOLIDAY"
              : "EXTRA_HOURS"),
          label: label ?? null,
          createdById,
        },
      })
    );
    created.push(toScheduleException(row));
  }

  logger.info("Schedule exception(s) created", {
    count: created.length,
    type,
    reason,
    createdById,
  });

  if (type === ScheduleExceptionType.AVAILABLE) {
    const { generateSlotsForScheduleException } = await import(
      "./slot.service"
    );
    for (const ex of created) {
      try {
        await generateSlotsForScheduleException(ex);
      } catch (err) {
        logger.error("Failed to generate slots for EXTRA_HOURS exception", {
          exceptionId: ex.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return created;
}

/**
 * Lists schedule exceptions with optional filters
 */
export async function listScheduleExceptions(options?: {
  doctorId?: string;
  startDate?: string;
  endDate?: string;
  type?: ScheduleExceptionType;
}): Promise<ScheduleException[]> {
  const where: Prisma.ScheduleExceptionWhereInput = {};

  if (options?.doctorId) {
    where.OR = [
      { doctorId: options.doctorId },
      { doctorId: null }, // ALL_DOCTORS
    ];
  }

  if (options?.startDate || options?.endDate) {
    where.AND = where.AND ?? [];
    if (options.startDate) {
      (where.AND as Prisma.ScheduleExceptionWhereInput[]).push({
        dateTo: { gte: new Date(options.startDate + "T00:00:00") },
      });
    }
    if (options.endDate) {
      (where.AND as Prisma.ScheduleExceptionWhereInput[]).push({
        dateFrom: { lte: new Date(options.endDate + "T23:59:59.999") },
      });
    }
  }

  if (options?.type) {
    where.type = options.type;
  }

  const rows = await query<
    {
      id: string;
      doctorId: string | null;
      dateFrom: Date;
      dateTo: Date;
      startTime: string | null;
      endTime: string | null;
      type: string;
      reason: string;
      label: string | null;
      createdById: string;
      createdAt: Date;
    }[]
  >((prisma) =>
    prisma.scheduleException.findMany({
      where,
      orderBy: [{ dateFrom: "asc" }, { createdAt: "desc" }],
    })
  );

  return rows.map(toScheduleException);
}

/**
 * Gets schedule exceptions for a set of doctors and date range (for slot generation)
 * Returns exceptions that apply to any of the given doctors in the date range
 */
export async function getScheduleExceptionsForSlotGeneration(
  doctorIds: string[],
  startDate: Date,
  endDate: Date
): Promise<ScheduleException[]> {
  if (doctorIds.length === 0) return [];

  const where: Prisma.ScheduleExceptionWhereInput = {
    OR: [{ doctorId: null }, { doctorId: { in: doctorIds } }],
    dateTo: { gte: startDate },
    dateFrom: { lte: endDate },
  };

  const rows = await query<
    {
      id: string;
      doctorId: string | null;
      dateFrom: Date;
      dateTo: Date;
      startTime: string | null;
      endTime: string | null;
      type: string;
      reason: string;
      label: string | null;
      createdById: string;
      createdAt: Date;
    }[]
  >((prisma) =>
    prisma.scheduleException.findMany({
      where,
      orderBy: [{ dateFrom: "asc" }],
    })
  );

  return rows.map(toScheduleException);
}

/**
 * Deletes a schedule exception by ID
 */
export async function deleteScheduleException(id: string): Promise<void> {
  const existing = await query<{ id: string } | null>((prisma) =>
    prisma.scheduleException.findUnique({
      where: { id },
      select: { id: true },
    })
  );

  if (!existing) {
    throw createNotFoundError("Schedule exception");
  }

  const fullException = await getScheduleExceptionById(id);
  if (fullException.type === ScheduleExceptionType.AVAILABLE) {
    const { deleteSlotsForScheduleException } = await import("./slot.service");
    try {
      await deleteSlotsForScheduleException(fullException);
    } catch (err) {
      logger.error("Failed to delete slots for schedule exception", {
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await query((prisma) =>
    prisma.scheduleException.delete({
      where: { id },
    })
  );

  logger.info("Schedule exception deleted", { id });
}

/**
 * Gets a single schedule exception by ID
 */
export async function getScheduleExceptionById(
  id: string
): Promise<ScheduleException> {
  const row = await query<{
    id: string;
    doctorId: string | null;
    dateFrom: Date;
    dateTo: Date;
    startTime: string | null;
    endTime: string | null;
    type: string;
    reason: string;
    label: string | null;
    createdById: string;
    createdAt: Date;
  } | null>((prisma) =>
    prisma.scheduleException.findUnique({
      where: { id },
    })
  );

  if (!row) {
    throw createNotFoundError("Schedule exception");
  }

  return toScheduleException(row);
}
