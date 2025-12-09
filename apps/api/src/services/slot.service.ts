/**
 * Slot service functions
 * Handles slot generation and management business logic
 */

import { query, withTransaction, Prisma } from "@app/db";
import {
  Slot,
  SlotTemplate,
  SlotStatus,
  CreateSlotTemplateInput,
  UpdateSlotTemplateInput,
  Availability,
  AppointmentStatus,
} from "@medbook/types";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../utils/errors";
import { logger } from "../utils/logger";
import { getAvailabilityById } from "./availability.service";

/**
 * Gets or creates default slot template for a doctor
 * @param doctorId Doctor ID
 * @returns Slot template
 */
export async function getOrCreateSlotTemplate(
  doctorId: string
): Promise<SlotTemplate> {
  let template = await query<{
    id: string;
    doctorId: string;
    durationMinutes: number;
    bufferMinutes: number;
    advanceBookingDays: number;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.slotTemplate.findUnique({
      where: { doctorId },
    })
  );

  if (!template) {
    // Create default template
    template = await query<{
      id: string;
      doctorId: string;
      durationMinutes: number;
      bufferMinutes: number;
      advanceBookingDays: number;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.slotTemplate.create({
        data: {
          doctorId,
          durationMinutes: 30,
          bufferMinutes: 0,
          advanceBookingDays: 30,
        },
      })
    );
    logger.info("Created default slot template", { doctorId });
  }

  return {
    id: template.id,
    doctorId: template.doctorId,
    durationMinutes: template.durationMinutes,
    bufferMinutes: template.bufferMinutes,
    advanceBookingDays: template.advanceBookingDays,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * Gets slot template for a doctor
 * @param doctorId Doctor ID
 * @returns Slot template or null
 */
export async function getSlotTemplate(
  doctorId: string
): Promise<SlotTemplate | null> {
  const template = await query<{
    id: string;
    doctorId: string;
    durationMinutes: number;
    bufferMinutes: number;
    advanceBookingDays: number;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.slotTemplate.findUnique({
      where: { doctorId },
    })
  );

  if (!template) {
    return null;
  }

  return {
    id: template.id,
    doctorId: template.doctorId,
    durationMinutes: template.durationMinutes,
    bufferMinutes: template.bufferMinutes,
    advanceBookingDays: template.advanceBookingDays,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * Creates or updates slot template for a doctor
 * @param input Slot template input
 * @returns Slot template
 */
export async function upsertSlotTemplate(
  input: CreateSlotTemplateInput
): Promise<SlotTemplate> {
  // Validate duration
  if (input.durationMinutes && input.durationMinutes < 5) {
    throw createValidationError("Slot duration must be at least 5 minutes");
  }
  if (input.durationMinutes && input.durationMinutes > 480) {
    throw createValidationError("Slot duration cannot exceed 8 hours");
  }

  if (input.bufferMinutes && input.bufferMinutes < 0) {
    throw createValidationError("Buffer minutes cannot be negative");
  }

  if (input.advanceBookingDays && input.advanceBookingDays < 1) {
    throw createValidationError("Advance booking days must be at least 1 day");
  }

  const template = await query<{
    id: string;
    doctorId: string;
    durationMinutes: number;
    bufferMinutes: number;
    advanceBookingDays: number;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.slotTemplate.upsert({
      where: { doctorId: input.doctorId },
      create: {
        doctorId: input.doctorId,
        durationMinutes: input.durationMinutes ?? 30,
        bufferMinutes: input.bufferMinutes ?? 0,
        advanceBookingDays: input.advanceBookingDays ?? 30,
      },
      update: {
        durationMinutes: input.durationMinutes,
        bufferMinutes: input.bufferMinutes,
        advanceBookingDays: input.advanceBookingDays,
      },
    })
  );

  logger.info("Slot template upserted", { doctorId: input.doctorId });

  return {
    id: template.id,
    doctorId: template.doctorId,
    durationMinutes: template.durationMinutes,
    bufferMinutes: template.bufferMinutes,
    advanceBookingDays: template.advanceBookingDays,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * Generates slots from availability based on doctor's slot template
 * @param availabilityId Availability ID
 * @param doctorId Doctor ID
 * @returns Array of created slots
 */
export async function generateSlotsFromAvailability(
  availabilityId: string,
  doctorId: string
): Promise<Slot[]> {
  // Get availability
  const availability = await getAvailabilityById(availabilityId);

  // Get slot template (or use defaults)
  const template = await getOrCreateSlotTemplate(doctorId);

  // Generate slots
  let slots: Array<{
    doctorId: string;
    availabilityId: string;
    startTime: Date;
    endTime: Date;
    status: SlotStatus;
  }> = [];

  if (availability.isRecurring && availability.dayOfWeek !== undefined) {
    slots = generateRecurringSlots(availability, template);
  } else {
    slots = generateOneTimeSlots(availability, template);
  }

  // Filter out slots that already exist or are in the past
  const now = new Date();
  const existingSlots = await query<
    {
      startTime: Date;
      endTime: Date;
    }[]
  >((prisma) =>
    prisma.slot.findMany({
      where: {
        doctorId,
        availabilityId,
        startTime: { gte: now },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    })
  );

  // Create a set of existing slot keys for quick lookup
  const existingKeys = new Set(
    existingSlots.map((s) => `${s.startTime.getTime()}-${s.endTime.getTime()}`)
  );

  // Filter out duplicates and past slots
  const newSlots = slots.filter((slot) => {
    const key = `${slot.startTime.getTime()}-${slot.endTime.getTime()}`;
    return (
      !existingKeys.has(key) &&
      slot.startTime >= now &&
      slot.endTime > slot.startTime
    );
  });

  if (newSlots.length === 0) {
    logger.info("No new slots to generate", { availabilityId, doctorId });
    return [];
  }

  // Bulk insert slots
  const createdSlots = await query<
    {
      id: string;
      doctorId: string;
      availabilityId: string | null;
      startTime: Date;
      endTime: Date;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >((prisma) =>
    prisma.slot.createManyAndReturn({
      data: newSlots,
    })
  );

  logger.info("Generated slots from availability", {
    availabilityId,
    doctorId,
    count: createdSlots.length,
  });

  return createdSlots.map((slot) => ({
    id: slot.id,
    doctorId: slot.doctorId,
    availabilityId: slot.availabilityId ?? undefined,
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: slot.status as SlotStatus,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  }));
}

/**
 * Generates recurring slots from availability
 */
function generateRecurringSlots(
  availability: Availability,
  template: SlotTemplate
): Array<{
  doctorId: string;
  availabilityId: string;
  startTime: Date;
  endTime: Date;
  status: SlotStatus;
}> {
  const slots: Array<{
    doctorId: string;
    availabilityId: string;
    startTime: Date;
    endTime: Date;
    status: SlotStatus;
  }> = [];

  const durationMs = template.durationMinutes * 60 * 1000;
  const bufferMs = template.bufferMinutes * 60 * 1000;

  const validFrom = availability.validFrom || new Date();
  const validTo =
    availability.validTo ||
    new Date(Date.now() + template.advanceBookingDays * 24 * 60 * 60 * 1000);

  // Get start/end times from availability
  const availStart = new Date(availability.startTime);
  const availEnd = new Date(availability.endTime);
  const startHour = availStart.getHours();
  const startMin = availStart.getMinutes();
  const endHour = availEnd.getHours();
  const endMin = availEnd.getMinutes();

  // Iterate through each occurrence of the day
  const currentDate = new Date(validFrom);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= validTo) {
    if (currentDate.getDay() === availability.dayOfWeek) {
      // Generate slots for this day
      let slotStart = new Date(currentDate);
      slotStart.setHours(startHour, startMin, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMin, 0, 0);

      while (slotStart.getTime() + durationMs <= dayEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        slots.push({
          doctorId: availability.doctorId,
          availabilityId: availability.id,
          startTime: new Date(slotStart),
          endTime: new Date(slotEnd),
          status: SlotStatus.AVAILABLE,
        });

        // Move to next slot (with buffer)
        slotStart = new Date(slotEnd.getTime() + bufferMs);
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

/**
 * Generates one-time slots from availability
 */
function generateOneTimeSlots(
  availability: Availability,
  template: SlotTemplate
): Array<{
  doctorId: string;
  availabilityId: string;
  startTime: Date;
  endTime: Date;
  status: SlotStatus;
}> {
  const slots: Array<{
    doctorId: string;
    availabilityId: string;
    startTime: Date;
    endTime: Date;
    status: SlotStatus;
  }> = [];

  const durationMs = template.durationMinutes * 60 * 1000;
  const bufferMs = template.bufferMinutes * 60 * 1000;

  const availStart = new Date(availability.startTime);
  const availEnd = new Date(availability.endTime);
  const availabilityDurationMs = availEnd.getTime() - availStart.getTime();

  // If availability is shorter than slot duration, create a single slot matching the availability
  if (availabilityDurationMs < durationMs) {
    logger.info(
      "Availability shorter than slot duration, creating single slot",
      {
        availabilityId: availability.id,
        availabilityDurationMs,
        slotDurationMs: durationMs,
      }
    );
    slots.push({
      doctorId: availability.doctorId,
      availabilityId: availability.id,
      startTime: new Date(availStart),
      endTime: new Date(availEnd),
      status: SlotStatus.AVAILABLE,
    });
    return slots;
  }

  // Otherwise, generate multiple slots based on template
  let slotStart = new Date(availStart);

  while (slotStart.getTime() + durationMs <= availEnd.getTime()) {
    const slotEnd = new Date(slotStart.getTime() + durationMs);

    slots.push({
      doctorId: availability.doctorId,
      availabilityId: availability.id,
      startTime: new Date(slotStart),
      endTime: new Date(slotEnd),
      status: SlotStatus.AVAILABLE,
    });

    // Move to next slot (with buffer)
    slotStart = new Date(slotEnd.getTime() + bufferMs);
  }

  return slots;
}

/**
 * Gets slots for a doctor
 * If no slots exist, automatically generates them from availabilities
 * @param doctorId Doctor ID
 * @param options Query options
 * @returns List of slots (only slots with valid availabilities)
 */
export async function getSlotsByDoctorId(
  doctorId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    status?: SlotStatus;
  }
): Promise<Slot[]> {
  const now = new Date();
  const startDate = options?.startDate ?? now;
  const endDate = options?.endDate;

  const where: Prisma.SlotWhereInput = {
    doctorId,
    startTime: { gte: startDate },
    // Only include slots that have a valid availability (not orphaned)
    // This ensures deleted availabilities don't show "ghost slots"
    availability: {
      isNot: null,
    },
  };

  if (endDate) {
    where.endTime = { lte: endDate };
  }

  if (options?.status) {
    where.status = options.status;
  }

  let slots = await query<
    {
      id: string;
      doctorId: string;
      availabilityId: string | null;
      startTime: Date;
      endTime: Date;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >((prisma) =>
    prisma.slot.findMany({
      where,
      orderBy: {
        startTime: "asc",
      },
    })
  );

  // If no slots found, try to generate them from availabilities
  if (slots.length === 0) {
    logger.info(
      "No slots found for doctor, attempting to generate from availabilities",
      {
        doctorId,
        startDate,
        endDate,
      }
    );

    // Import here to avoid circular dependency
    const { getAvailabilitiesByDoctorId } = await import(
      "./availability.service"
    );

    // Get active availabilities for this doctor
    const availabilities = await getAvailabilitiesByDoctorId(doctorId, {
      startDate,
      endDate,
    });

    logger.info("Found availabilities for slot generation", {
      doctorId,
      availabilityCount: availabilities.length,
      availabilities: availabilities.map((a) => ({
        id: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        isRecurring: a.isRecurring,
      })),
    });

    // Generate slots for each availability
    for (const availability of availabilities) {
      try {
        const generatedSlots = await generateSlotsFromAvailability(
          availability.id,
          doctorId
        );
        if (generatedSlots.length > 0) {
          logger.info("Generated slots from availability", {
            availabilityId: availability.id,
            doctorId,
            slotCount: generatedSlots.length,
            slots: generatedSlots.map((s) => ({
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          });
        } else {
          logger.warn("No slots generated from availability", {
            availabilityId: availability.id,
            doctorId,
            availabilityStart: availability.startTime,
            availabilityEnd: availability.endTime,
            isRecurring: availability.isRecurring,
          });
        }
      } catch (error) {
        logger.error("Failed to generate slots from availability", {
          availabilityId: availability.id,
          doctorId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    // Fetch slots again after generation
    slots = await query<
      {
        id: string;
        doctorId: string;
        availabilityId: string | null;
        startTime: Date;
        endTime: Date;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }[]
    >((prisma) =>
      prisma.slot.findMany({
        where,
        orderBy: {
          startTime: "asc",
        },
      })
    );
  }

  return slots.map((slot) => ({
    id: slot.id,
    doctorId: slot.doctorId,
    availabilityId: slot.availabilityId ?? undefined,
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: slot.status as SlotStatus,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  }));
}

/**
 * Gets a slot by ID
 * @param slotId Slot ID
 * @returns Slot
 * @throws AppError if slot not found
 */
export async function getSlotById(slotId: string): Promise<Slot> {
  const slot = await query<{
    id: string;
    doctorId: string;
    availabilityId: string | null;
    startTime: Date;
    endTime: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.slot.findUnique({
      where: { id: slotId },
    })
  );

  if (!slot) {
    throw createNotFoundError("Slot");
  }

  return {
    id: slot.id,
    doctorId: slot.doctorId,
    availabilityId: slot.availabilityId ?? undefined,
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: slot.status as SlotStatus,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}

/**
 * Blocks a slot (makes it unavailable for booking)
 * @param slotId Slot ID
 * @param doctorId Doctor ID (for authorization)
 * @returns Updated slot
 */
export async function blockSlot(
  slotId: string,
  doctorId: string
): Promise<Slot> {
  const slot = await getSlotById(slotId);

  if (slot.doctorId !== doctorId) {
    throw createValidationError("You can only block your own slots");
  }

  if (slot.status === SlotStatus.BOOKED) {
    throw createConflictError("Cannot block a booked slot");
  }

  const updated = await query<{
    id: string;
    doctorId: string;
    availabilityId: string | null;
    startTime: Date;
    endTime: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.slot.update({
      where: { id: slotId },
      data: { status: SlotStatus.BLOCKED },
    })
  );

  logger.info("Slot blocked", { slotId, doctorId });

  return {
    id: updated.id,
    doctorId: updated.doctorId,
    availabilityId: updated.availabilityId ?? undefined,
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status as SlotStatus,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Unblocks a slot (makes it available for booking)
 * @param slotId Slot ID
 * @param doctorId Doctor ID (for authorization)
 * @returns Updated slot
 */
export async function unblockSlot(
  slotId: string,
  doctorId: string
): Promise<Slot> {
  const slot = await getSlotById(slotId);

  if (slot.doctorId !== doctorId) {
    throw createValidationError("You can only unblock your own slots");
  }

  if (slot.status !== SlotStatus.BLOCKED) {
    throw createValidationError("Slot is not blocked");
  }

  const updated = await query<{
    id: string;
    doctorId: string;
    availabilityId: string | null;
    startTime: Date;
    endTime: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.slot.update({
      where: { id: slotId },
      data: { status: SlotStatus.AVAILABLE },
    })
  );

  logger.info("Slot unblocked", { slotId, doctorId });

  return {
    id: updated.id,
    doctorId: updated.doctorId,
    availabilityId: updated.availabilityId ?? undefined,
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status as SlotStatus,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Updates slot status (used internally for booking)
 * @param slotId Slot ID
 * @param status New status
 * @returns Updated slot
 */
export async function updateSlotStatus(
  slotId: string,
  status: SlotStatus
): Promise<Slot> {
  const updated = await query<{
    id: string;
    doctorId: string;
    availabilityId: string | null;
    startTime: Date;
    endTime: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.slot.update({
      where: { id: slotId },
      data: { status },
    })
  );

  return {
    id: updated.id,
    doctorId: updated.doctorId,
    availabilityId: updated.availabilityId ?? undefined,
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status as SlotStatus,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Counts non-cancelled appointments for a specific slot
 * @param slotId Slot ID
 * @returns Count of non-cancelled appointments
 */
async function countNonCancelledAppointmentsForSlot(
  slotId: string
): Promise<number> {
  const result = await query<{ _count: { id: number } }>((prisma) =>
    prisma.appointment.aggregate({
      _count: { id: true },
      where: {
        slotId: slotId,
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    })
  );

  return result._count.id;
}

/**
 * Deletes a slot
 * @param slotId Slot ID
 * @param doctorId Doctor ID (for authorization)
 * @throws AppError if slot not found, unauthorized, or has non-cancelled appointments
 */
export async function deleteSlot(
  slotId: string,
  doctorId: string
): Promise<void> {
  const slot = await getSlotById(slotId);

  if (slot.doctorId !== doctorId) {
    throw createValidationError("You can only delete your own slots");
  }

  // Check for non-cancelled appointments linked to this slot
  const appointmentCount = await countNonCancelledAppointmentsForSlot(slotId);

  if (appointmentCount > 0) {
    throw createConflictError(
      `Cannot delete slot: ${appointmentCount} appointment${appointmentCount === 1 ? "" : "s"} exist${appointmentCount === 1 ? "s" : ""} for this slot. Cancel or reschedule ${appointmentCount === 1 ? "it" : "them"} first.`
    );
  }

  await query((prisma) =>
    prisma.slot.delete({
      where: { id: slotId },
    })
  );

  logger.info("Slot deleted", { slotId, doctorId });
}

/**
 * Cleans up old slots (removes past available slots)
 * @param beforeDate Delete slots before this date
 * @returns Number of deleted slots
 */
export async function cleanupOldSlots(beforeDate?: Date): Promise<number> {
  const date = beforeDate ?? new Date();

  const result = await query<{ count: number }>((prisma) =>
    prisma.slot.deleteMany({
      where: {
        endTime: { lt: date },
        status: SlotStatus.AVAILABLE, // Only delete unused past slots
      },
    })
  );

  logger.info("Cleaned up old slots", {
    count: result.count,
    beforeDate: date,
  });

  return result.count;
}
