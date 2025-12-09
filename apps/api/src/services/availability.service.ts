/**
 * Availability service functions
 * Handles doctor availability/schedule management business logic
 */

import { query, Prisma } from "@app/db";
import {
  Availability,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  AppointmentStatus,
} from "@medbook/types";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../utils/errors";
import { logger } from "../utils/logger";
import { generateSlotsFromAvailability } from "./slot.service";

/**
 * Gets availability by ID
 * @param availabilityId Availability ID
 * @returns Availability data
 * @throws AppError if availability not found
 */
export async function getAvailabilityById(
  availabilityId: string
): Promise<Availability> {
  const availability = await query<{
    id: string;
    doctorId: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: number | null;
    isRecurring: boolean;
    validFrom: Date | null;
    validTo: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.availability.findUnique({
      where: { id: availabilityId },
    })
  );

  if (!availability) {
    throw createNotFoundError("Availability");
  }

  return {
    id: availability.id,
    doctorId: availability.doctorId,
    startTime: availability.startTime,
    endTime: availability.endTime,
    dayOfWeek: availability.dayOfWeek ?? undefined,
    isRecurring: availability.isRecurring,
    validFrom: availability.validFrom ?? undefined,
    validTo: availability.validTo ?? undefined,
    createdAt: availability.createdAt,
    updatedAt: availability.updatedAt,
  };
}

/**
 * Gets all availabilities for a doctor
 * @param doctorId Doctor ID
 * @param options Query options (startDate, endDate)
 * @returns List of availabilities
 */
export async function getAvailabilitiesByDoctorId(
  doctorId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Availability[]> {
  const now = new Date();
  const startDate = options?.startDate ?? now;
  const endDate = options?.endDate;

  // Build where clause - need to handle one-time vs recurring differently
  const where: Prisma.AvailabilityWhereInput = {
    doctorId,
    OR: [
      // One-time slots: endTime must be >= startDate (slot hasn't ended before search window)
      {
        AND: [
          { isRecurring: false },
          { endTime: { gte: startDate } },
          ...(endDate ? [{ startTime: { lte: endDate } }] : []),
        ],
      },
      // Recurring slots: check validFrom and validTo
      {
        AND: [
          { isRecurring: true },
          {
            OR: [
              { validFrom: null },
              { validFrom: { lte: endDate ?? new Date("2100-01-01") } },
            ],
          },
          {
            OR: [{ validTo: null }, { validTo: { gte: startDate } }],
          },
        ],
      },
    ],
  };

  const availabilities = await query<
    {
      id: string;
      doctorId: string;
      startTime: Date;
      endTime: Date;
      dayOfWeek: number | null;
      isRecurring: boolean;
      validFrom: Date | null;
      validTo: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >((prisma) =>
    prisma.availability.findMany({
      where,
      orderBy: {
        startTime: "asc",
      },
    })
  );

  return availabilities.map((availability) => ({
    id: availability.id,
    doctorId: availability.doctorId,
    startTime: availability.startTime,
    endTime: availability.endTime,
    dayOfWeek: availability.dayOfWeek ?? undefined,
    isRecurring: availability.isRecurring,
    validFrom: availability.validFrom ?? undefined,
    validTo: availability.validTo ?? undefined,
    createdAt: availability.createdAt,
    updatedAt: availability.updatedAt,
  }));
}

/**
 * Checks if a time slot overlaps with existing availabilities for a doctor
 * @param doctorId Doctor ID
 * @param startTime Start time
 * @param endTime End time
 * @param excludeId Optional availability ID to exclude from check (for updates)
 * @returns true if there's an overlap, false otherwise
 */
async function hasOverlap(
  doctorId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string
): Promise<boolean> {
  const where: Prisma.AvailabilityWhereInput = {
    doctorId,
    AND: [
      // Overlap condition: New slot starts before existing ends AND ends after existing starts
      { startTime: { lte: endTime } },
      { endTime: { gte: startTime } },
    ],
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const overlapping = await query<{
    id: string;
    doctorId: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: number | null;
    isRecurring: boolean;
    validFrom: Date | null;
    validTo: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.availability.findFirst({
      where,
    })
  );

  return overlapping !== null;
}

/**
 * Validates time slot
 * @param startTime Start time
 * @param endTime End time
 * @throws AppError if validation fails
 */
function validateTimeSlot(startTime: Date, endTime: Date): void {
  if (startTime >= endTime) {
    throw createValidationError("Start time must be before end time");
  }

  // Check if duration is reasonable (e.g., at least 15 minutes, max 24 hours)
  const durationMs = endTime.getTime() - startTime.getTime();
  const minDurationMs = 15 * 60 * 1000; // 15 minutes
  const maxDurationMs = 24 * 60 * 60 * 1000; // 24 hours

  if (durationMs < minDurationMs) {
    throw createValidationError("Time slot must be at least 15 minutes long");
  }

  if (durationMs > maxDurationMs) {
    throw createValidationError("Time slot cannot exceed 24 hours");
  }
}

/**
 * Creates a new availability
 * @param input Availability creation input
 * @returns Created availability data
 * @throws AppError if validation fails, doctor not found, or overlap detected
 */
export async function createAvailability(
  input: CreateAvailabilityInput
): Promise<Availability> {
  const {
    doctorId,
    startTime,
    endTime,
    dayOfWeek,
    isRecurring = false,
    validFrom,
    validTo,
  } = input;

  // Validate time slot
  validateTimeSlot(startTime, endTime);

  // Validate dayOfWeek if provided
  if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
    throw createValidationError(
      "Day of week must be between 0 (Sunday) and 6 (Saturday)"
    );
  }

  // Validate recurring schedule dates
  if (isRecurring) {
    if (!validFrom) {
      throw createValidationError(
        "validFrom is required for recurring schedules"
      );
    }
    if (validTo && validTo < validFrom) {
      throw createValidationError("validTo must be after validFrom");
    }
  }

  // Verify doctor exists
  const doctor = await query<{
    id: string;
    userId: string;
    specialization: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor");
  }

  // Check for overlaps (only for non-recurring or if checking specific date range)
  if (!isRecurring) {
    const hasOverlapping = await hasOverlap(doctorId, startTime, endTime);
    if (hasOverlapping) {
      throw createConflictError(
        "This time slot overlaps with an existing availability"
      );
    }
  }

  // Create availability
  try {
    const availability = await query<{
      id: string;
      doctorId: string;
      startTime: Date;
      endTime: Date;
      dayOfWeek: number | null;
      isRecurring: boolean;
      validFrom: Date | null;
      validTo: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.availability.create({
        data: {
          doctorId,
          startTime,
          endTime,
          dayOfWeek: dayOfWeek ?? null,
          isRecurring,
          validFrom: validFrom ?? null,
          validTo: validTo ?? null,
        },
      })
    );

    logger.info("Availability created", {
      availabilityId: availability.id,
      doctorId,
    });

    // Generate slots from availability (async, don't wait, but log success)
    generateSlotsFromAvailability(availability.id, doctorId)
      .then((slots) => {
        logger.info("Generated slots from availability", {
          availabilityId: availability.id,
          doctorId,
          slotCount: slots.length,
        });
      })
      .catch((err) => {
        logger.error("Failed to generate slots from availability", {
          availabilityId: availability.id,
          doctorId,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      });

    return {
      id: availability.id,
      doctorId: availability.doctorId,
      startTime: availability.startTime,
      endTime: availability.endTime,
      dayOfWeek: availability.dayOfWeek ?? undefined,
      isRecurring: availability.isRecurring,
      validFrom: availability.validFrom ?? undefined,
      validTo: availability.validTo ?? undefined,
      createdAt: availability.createdAt,
      updatedAt: availability.updatedAt,
    };
  } catch (error: unknown) {
    // Handle Prisma errors
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw createConflictError("Availability already exists");
    }
    throw error;
  }
}

/**
 * Updates availability
 * @param availabilityId Availability ID
 * @param input Update input
 * @returns Updated availability data
 * @throws AppError if availability not found or validation fails
 */
export async function updateAvailability(
  availabilityId: string,
  input: UpdateAvailabilityInput
): Promise<Availability> {
  const { startTime, endTime, dayOfWeek, isRecurring, validFrom, validTo } =
    input;

  // Check if availability exists
  const existingAvailability = await query<{
    id: string;
    doctorId: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: number | null;
    isRecurring: boolean;
    validFrom: Date | null;
    validTo: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.availability.findUnique({
      where: { id: availabilityId },
    })
  );

  if (!existingAvailability) {
    throw createNotFoundError("Availability");
  }

  // Use provided values or existing values
  const finalStartTime = startTime ?? existingAvailability.startTime;
  const finalEndTime = endTime ?? existingAvailability.endTime;
  const finalDayOfWeek =
    dayOfWeek !== undefined ? dayOfWeek : existingAvailability.dayOfWeek;
  const finalIsRecurring =
    isRecurring !== undefined ? isRecurring : existingAvailability.isRecurring;
  const finalValidFrom =
    validFrom !== undefined ? validFrom : existingAvailability.validFrom;
  const finalValidTo =
    validTo !== undefined ? validTo : existingAvailability.validTo;

  // Validate time slot if times are being updated
  if (startTime !== undefined || endTime !== undefined) {
    validateTimeSlot(finalStartTime, finalEndTime);
  }

  // Validate dayOfWeek if provided
  if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
    throw createValidationError(
      "Day of week must be between 0 (Sunday) and 6 (Saturday)"
    );
  }

  // Validate recurring schedule dates
  if (finalIsRecurring) {
    if (!finalValidFrom) {
      throw createValidationError(
        "validFrom is required for recurring schedules"
      );
    }
    if (finalValidTo && finalValidTo < finalValidFrom) {
      throw createValidationError("validTo must be after validFrom");
    }
  }

  // Check for overlaps (excluding current availability)
  if (startTime !== undefined || endTime !== undefined) {
    const hasOverlapping = await hasOverlap(
      existingAvailability.doctorId,
      finalStartTime,
      finalEndTime,
      availabilityId
    );
    if (hasOverlapping) {
      throw createConflictError(
        "This time slot overlaps with an existing availability"
      );
    }
  }

  // Update availability
  try {
    const availability = await query<{
      id: string;
      doctorId: string;
      startTime: Date;
      endTime: Date;
      dayOfWeek: number | null;
      isRecurring: boolean;
      validFrom: Date | null;
      validTo: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.availability.update({
        where: { id: availabilityId },
        data: {
          ...(startTime !== undefined && { startTime: finalStartTime }),
          ...(endTime !== undefined && { endTime: finalEndTime }),
          ...(dayOfWeek !== undefined && {
            dayOfWeek: finalDayOfWeek ?? null,
          }),
          ...(isRecurring !== undefined && { isRecurring: finalIsRecurring }),
          ...(validFrom !== undefined && {
            validFrom: finalValidFrom ?? null,
          }),
          ...(validTo !== undefined && { validTo: finalValidTo ?? null }),
        },
      })
    );

    logger.info("Availability updated", { availabilityId });

    return {
      id: availability.id,
      doctorId: availability.doctorId,
      startTime: availability.startTime,
      endTime: availability.endTime,
      dayOfWeek: availability.dayOfWeek ?? undefined,
      isRecurring: availability.isRecurring,
      validFrom: availability.validFrom ?? undefined,
      validTo: availability.validTo ?? undefined,
      createdAt: availability.createdAt,
      updatedAt: availability.updatedAt,
    };
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Availability");
    }
    throw error;
  }
}

/**
 * Counts non-cancelled appointments for slots linked to an availability
 * @param availabilityId Availability ID
 * @returns Count of non-cancelled appointments
 */
async function countNonCancelledAppointmentsForAvailability(
  availabilityId: string
): Promise<number> {
  const result = await query<{ _count: { id: number } }>((prisma) =>
    prisma.appointment.aggregate({
      _count: { id: true },
      where: {
        slot: {
          availabilityId: availabilityId,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    })
  );

  return result._count.id;
}

/**
 * Deletes availability
 * @param availabilityId Availability ID
 * @throws AppError if availability not found or has non-cancelled appointments
 */
export async function deleteAvailability(
  availabilityId: string
): Promise<void> {
  // Check if availability exists
  const existingAvailability = await query<{
    id: string;
    doctorId: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: number | null;
    isRecurring: boolean;
    validFrom: Date | null;
    validTo: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.availability.findUnique({
      where: { id: availabilityId },
    })
  );

  if (!existingAvailability) {
    throw createNotFoundError("Availability");
  }

  // Check for non-cancelled appointments linked to this availability's slots
  const appointmentCount =
    await countNonCancelledAppointmentsForAvailability(availabilityId);

  if (appointmentCount > 0) {
    throw createConflictError(
      `Cannot delete schedule: ${appointmentCount} appointment${appointmentCount === 1 ? "" : "s"} exist${appointmentCount === 1 ? "s" : ""} in this period. Cancel or reschedule them first.`
    );
  }

  try {
    // Delete associated slots first (they are linked to this availability)
    await query((prisma) =>
      prisma.slot.deleteMany({
        where: { availabilityId: availabilityId },
      })
    );

    // Then delete the availability
    await query<{
      id: string;
      doctorId: string;
      startTime: Date;
      endTime: Date;
      dayOfWeek: number | null;
      isRecurring: boolean;
      validFrom: Date | null;
      validTo: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.availability.delete({
        where: { id: availabilityId },
      })
    );

    logger.info("Availability deleted", {
      availabilityId,
      doctorId: existingAvailability.doctorId,
    });
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Availability");
    }
    throw error;
  }
}
