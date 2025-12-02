/**
 * Appointment service functions
 * Handles appointment booking and management business logic
 */

import { query, withTransaction } from "@app/db";
import {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentStatus,
  SlotStatus,
} from "@medbook/types";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../utils/errors";
import { logger } from "../utils/logger";
import { getAvailabilityById } from "./availability.service";
import { getSlotById, updateSlotStatus } from "./slot.service";

/**
 * Gets appointment by ID
 * @param appointmentId Appointment ID
 * @returns Appointment data
 * @throws AppError if appointment not found
 */
export async function getAppointmentById(
  appointmentId: string
): Promise<Appointment> {
  const appointment = await query((prisma) =>
    prisma.appointment.findUnique({
      where: { id: appointmentId },
    })
  );

  if (!appointment) {
    throw createNotFoundError("Appointment not found");
  }

  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    availabilityId: appointment.availabilityId ?? undefined,
    slotId: appointment.slotId ?? undefined,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status as AppointmentStatus,
    notes: appointment.notes ?? undefined,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

/**
 * Gets all appointments for a patient
 * @param patientId Patient user ID
 * @param options Query options (status, startDate, endDate)
 * @returns List of appointments
 */
export async function getAppointmentsByPatientId(
  patientId: string,
  options?: {
    status?: AppointmentStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Appointment[]> {
  const where: {
    patientId: string;
    status?: AppointmentStatus;
    startTime?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    patientId,
  };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.startDate || options?.endDate) {
    where.startTime = {};
    if (options.startDate) {
      where.startTime.gte = options.startDate;
    }
    if (options.endDate) {
      where.startTime.lte = options.endDate;
    }
  }

  const appointments = await query((prisma) =>
    prisma.appointment.findMany({
      where,
      orderBy: {
        startTime: "asc",
      },
    })
  );

  return appointments.map((appointment) => ({
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    availabilityId: appointment.availabilityId ?? undefined,
    slotId: appointment.slotId ?? undefined,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status as AppointmentStatus,
    notes: appointment.notes ?? undefined,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }));
}

/**
 * Gets all appointments for a doctor
 * @param doctorId Doctor ID
 * @param options Query options (status, startDate, endDate)
 * @returns List of appointments
 */
export async function getAppointmentsByDoctorId(
  doctorId: string,
  options?: {
    status?: AppointmentStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Appointment[]> {
  const where: {
    doctorId: string;
    status?: AppointmentStatus;
    startTime?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    doctorId,
  };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.startDate || options?.endDate) {
    where.startTime = {};
    if (options.startDate) {
      where.startTime.gte = options.startDate;
    }
    if (options.endDate) {
      where.startTime.lte = options.endDate;
    }
  }

  const appointments = await query((prisma) =>
    prisma.appointment.findMany({
      where,
      orderBy: {
        startTime: "asc",
      },
    })
  );

  return appointments.map((appointment) => ({
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    availabilityId: appointment.availabilityId ?? undefined,
    slotId: appointment.slotId ?? undefined,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status as AppointmentStatus,
    notes: appointment.notes ?? undefined,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }));
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
    throw createValidationError("Appointment must be at least 15 minutes long");
  }

  if (durationMs > maxDurationMs) {
    throw createValidationError("Appointment cannot exceed 24 hours");
  }

  // Check if appointment is in the future
  const now = new Date();
  if (startTime < now) {
    throw createValidationError("Appointment must be scheduled in the future");
  }
}

/**
 * Checks if appointment time conflicts with existing appointments
 * @param doctorId Doctor ID
 * @param startTime Start time
 * @param endTime End time
 * @param excludeId Optional appointment ID to exclude from check (for updates)
 * @returns true if there's a conflict, false otherwise
 */
async function hasTimeConflict(
  doctorId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string
): Promise<boolean> {
  const where: {
    doctorId: string;
    id?: { not: string };
    status?: { not: AppointmentStatus };
    AND: Array<{
      startTime: { lte: Date };
      endTime: { gte: Date };
    }>;
  } = {
    doctorId,
    // Only check conflicts with non-cancelled appointments
    status: { not: AppointmentStatus.CANCELLED },
    AND: [
      // Conflict condition: New appointment starts before existing ends AND ends after existing starts
      { startTime: { lte: endTime } },
      { endTime: { gte: startTime } },
    ],
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const conflicting = await query((prisma) =>
    prisma.appointment.findFirst({
      where,
    })
  );

  return conflicting !== null;
}

/**
 * Checks if appointment time is within doctor's availability
 * @param doctorId Doctor ID
 * @param startTime Start time
 * @param endTime End time
 * @param availabilityId Optional availability ID to check against
 * @returns true if within availability, false otherwise
 */
async function isWithinAvailability(
  doctorId: string,
  startTime: Date,
  endTime: Date,
  availabilityId?: string
): Promise<boolean> {
  // If availabilityId is provided, check against that specific availability
  if (availabilityId) {
    try {
      const availability = await getAvailabilityById(availabilityId);

      // Verify it belongs to the doctor
      if (availability.doctorId !== doctorId) {
        return false;
      }

      // For recurring availability, check if appointment time matches the pattern
      if (availability.isRecurring) {
        // Check if appointment day matches dayOfWeek
        if (availability.dayOfWeek !== undefined) {
          const appointmentDayOfWeek = startTime.getDay();
          if (appointmentDayOfWeek !== availability.dayOfWeek) {
            return false;
          }
        }

        // Check if appointment is within validFrom/validTo range
        if (availability.validFrom && startTime < availability.validFrom) {
          return false;
        }
        if (availability.validTo && startTime > availability.validTo) {
          return false;
        }

        // Check if appointment time matches the time slot pattern
        const availabilityStart = new Date(availability.startTime);
        const availabilityEnd = new Date(availability.endTime);
        const appointmentStartTime = new Date(startTime);
        const appointmentEndTime = new Date(endTime);

        // Extract time components (hours and minutes)
        const availabilityStartHours = availabilityStart.getHours();
        const availabilityStartMinutes = availabilityStart.getMinutes();
        const availabilityEndHours = availabilityEnd.getHours();
        const availabilityEndMinutes = availabilityEnd.getMinutes();

        const appointmentStartHours = appointmentStartTime.getHours();
        const appointmentStartMinutes = appointmentStartTime.getMinutes();
        const appointmentEndHours = appointmentEndTime.getHours();
        const appointmentEndMinutes = appointmentEndTime.getMinutes();

        // Check if appointment time is within availability time window
        const appointmentStartMinutesTotal =
          appointmentStartHours * 60 + appointmentStartMinutes;
        const appointmentEndMinutesTotal =
          appointmentEndHours * 60 + appointmentEndMinutes;
        const availabilityStartMinutesTotal =
          availabilityStartHours * 60 + availabilityStartMinutes;
        const availabilityEndMinutesTotal =
          availabilityEndHours * 60 + availabilityEndMinutes;

        if (
          appointmentStartMinutesTotal < availabilityStartMinutesTotal ||
          appointmentEndMinutesTotal > availabilityEndMinutesTotal
        ) {
          return false;
        }
      } else {
        // For one-time availability, check exact time match
        if (
          startTime < availability.startTime ||
          endTime > availability.endTime
        ) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // Availability not found
      return false;
    }
  }

  // If no availabilityId provided, check against all doctor's availabilities
  const availabilities = await query((prisma) =>
    prisma.availability.findMany({
      where: { doctorId },
    })
  );

  for (const availability of availabilities) {
    if (availability.isRecurring) {
      // Check recurring pattern
      if (availability.dayOfWeek !== null) {
        const appointmentDayOfWeek = startTime.getDay();
        if (appointmentDayOfWeek !== availability.dayOfWeek) {
          continue;
        }
      }

      // Check date range
      if (availability.validFrom && startTime < availability.validFrom) {
        continue;
      }
      if (availability.validTo && startTime > availability.validTo) {
        continue;
      }

      // Check time window
      const availabilityStart = new Date(availability.startTime);
      const availabilityEnd = new Date(availability.endTime);
      const appointmentStartTime = new Date(startTime);
      const appointmentEndTime = new Date(endTime);

      const availabilityStartMinutesTotal =
        availabilityStart.getHours() * 60 + availabilityStart.getMinutes();
      const availabilityEndMinutesTotal =
        availabilityEnd.getHours() * 60 + availabilityEnd.getMinutes();
      const appointmentStartMinutesTotal =
        appointmentStartTime.getHours() * 60 +
        appointmentStartTime.getMinutes();
      const appointmentEndMinutesTotal =
        appointmentEndTime.getHours() * 60 + appointmentEndTime.getMinutes();

      if (
        appointmentStartMinutesTotal >= availabilityStartMinutesTotal &&
        appointmentEndMinutesTotal <= availabilityEndMinutesTotal
      ) {
        return true;
      }
    } else {
      // Check one-time availability
      if (
        startTime >= availability.startTime &&
        endTime <= availability.endTime
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Creates a new appointment from a slot (atomic booking)
 * @param slotId Slot ID
 * @param patientId Patient ID
 * @param notes Optional notes
 * @returns Created appointment data
 * @throws AppError if slot not found, not available, or conflict detected
 */
export async function createAppointmentFromSlot(
  slotId: string,
  patientId: string,
  notes?: string
): Promise<Appointment> {
  // Use transaction to ensure atomicity
  return await withTransaction(async (tx) => {
    // Lock the slot row (SELECT FOR UPDATE equivalent via findUnique)
    const slot = await tx.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw createNotFoundError("Slot not found");
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw createConflictError("Slot is not available for booking");
    }

    // Verify patient exists
    const patient = await tx.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw createNotFoundError("Patient not found");
    }

    // Create appointment
    const appointment = await tx.appointment.create({
      data: {
        patientId,
        doctorId: slot.doctorId,
        availabilityId: slot.availabilityId ?? null,
        slotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: AppointmentStatus.PENDING,
        notes: notes ?? null,
      },
    });

    // Update slot status atomically
    await tx.slot.update({
      where: { id: slotId },
      data: { status: SlotStatus.BOOKED },
    });

    logger.info("Appointment created from slot", {
      appointmentId: appointment.id,
      slotId,
      patientId,
      doctorId: slot.doctorId,
    });

    return {
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      availabilityId: appointment.availabilityId ?? undefined,
      slotId: appointment.slotId ?? undefined,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status as AppointmentStatus,
      notes: appointment.notes ?? undefined,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  });
}

/**
 * Creates a new appointment
 * @param input Appointment creation input
 * @returns Created appointment data
 * @throws AppError if validation fails, doctor/patient not found, or conflict detected
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<Appointment> {
  // If slotId is provided, use slot-based booking
  if (input.slotId) {
    return await createAppointmentFromSlot(
      input.slotId,
      input.patientId,
      input.notes
    );
  }

  const { patientId, doctorId, availabilityId, startTime, endTime, notes } =
    input;

  // Validate time slot
  validateTimeSlot(startTime, endTime);

  // Verify patient exists
  const patient = await query((prisma) =>
    prisma.user.findUnique({
      where: { id: patientId },
    })
  );

  if (!patient) {
    throw createNotFoundError("Patient not found");
  }

  // Verify doctor exists
  const doctor = await query((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor not found");
  }

  // Check if appointment time is within doctor's availability
  const withinAvailability = await isWithinAvailability(
    doctorId,
    startTime,
    endTime,
    availabilityId
  );

  if (!withinAvailability) {
    throw createValidationError(
      "Appointment time is not within doctor's availability"
    );
  }

  // Check for time conflicts with existing appointments
  const hasConflict = await hasTimeConflict(doctorId, startTime, endTime);
  if (hasConflict) {
    throw createConflictError(
      "This time slot conflicts with an existing appointment"
    );
  }

  // Create appointment
  try {
    const appointment = await query((prisma) =>
      prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          availabilityId: availabilityId ?? null,
          slotId: null, // No slot for legacy booking
          startTime,
          endTime,
          status: AppointmentStatus.PENDING,
          notes: notes ?? null,
        },
      })
    );

    logger.info("Appointment created", {
      appointmentId: appointment.id,
      patientId,
      doctorId,
    });

    return {
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      availabilityId: appointment.availabilityId ?? undefined,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status as AppointmentStatus,
      notes: appointment.notes ?? undefined,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  } catch (error: unknown) {
    // Handle Prisma errors
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw createConflictError("Appointment already exists");
    }
    throw error;
  }
}

/**
 * Updates appointment
 * @param appointmentId Appointment ID
 * @param input Update input
 * @returns Updated appointment data
 * @throws AppError if appointment not found or validation fails
 */
export async function updateAppointment(
  appointmentId: string,
  input: UpdateAppointmentInput
): Promise<Appointment> {
  const { startTime, endTime, status, notes } = input;

  // Check if appointment exists
  const existingAppointment = await query((prisma) =>
    prisma.appointment.findUnique({
      where: { id: appointmentId },
    })
  );

  if (!existingAppointment) {
    throw createNotFoundError("Appointment not found");
  }

  // Use provided values or existing values
  const finalStartTime = startTime ?? existingAppointment.startTime;
  const finalEndTime = endTime ?? existingAppointment.endTime;
  const finalStatus =
    status ?? (existingAppointment.status as AppointmentStatus);

  // Validate time slot if times are being updated
  if (startTime !== undefined || endTime !== undefined) {
    validateTimeSlot(finalStartTime, finalEndTime);

    // Check if appointment time is within doctor's availability
    const withinAvailability = await isWithinAvailability(
      existingAppointment.doctorId,
      finalStartTime,
      finalEndTime,
      existingAppointment.availabilityId ?? undefined
    );

    if (!withinAvailability) {
      throw createValidationError(
        "Appointment time is not within doctor's availability"
      );
    }

    // Check for time conflicts (excluding current appointment)
    const hasConflict = await hasTimeConflict(
      existingAppointment.doctorId,
      finalStartTime,
      finalEndTime,
      appointmentId
    );
    if (hasConflict) {
      throw createConflictError(
        "This time slot conflicts with an existing appointment"
      );
    }
  }

  // Update appointment and handle slot status if needed
  try {
    // If cancelling an appointment with a slot, update slot status
    if (
      status === AppointmentStatus.CANCELLED &&
      existingAppointment.slotId &&
      existingAppointment.status !== AppointmentStatus.CANCELLED
    ) {
      await updateSlotStatus(existingAppointment.slotId, SlotStatus.AVAILABLE);
      logger.info("Slot freed due to appointment cancellation", {
        slotId: existingAppointment.slotId,
        appointmentId,
      });
    }

    const appointment = await query((prisma) =>
      prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          ...(startTime !== undefined && { startTime: finalStartTime }),
          ...(endTime !== undefined && { endTime: finalEndTime }),
          ...(status !== undefined && { status: finalStatus }),
          ...(notes !== undefined && { notes: notes ?? null }),
        },
      })
    );

    logger.info("Appointment updated", { appointmentId });

    return {
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      availabilityId: appointment.availabilityId ?? undefined,
      slotId: appointment.slotId ?? undefined,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status as AppointmentStatus,
      notes: appointment.notes ?? undefined,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Appointment not found");
    }
    throw error;
  }
}
