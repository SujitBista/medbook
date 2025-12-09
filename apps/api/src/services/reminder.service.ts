/**
 * Reminder service functions
 * Handles appointment reminder scheduling and management
 */

import {
  query,
  withTransaction,
  ReminderType as PrismaReminderType,
} from "@app/db";
import { ReminderType } from "@medbook/types";
import { createNotFoundError, createValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { sendAppointmentReminderEmail } from "./email.service";

/**
 * Creates a reminder for an appointment
 * @param appointmentId Appointment ID
 * @param appointmentStartTime When the appointment starts
 * @param reminderType Type of reminder (default: 24 hours before)
 * @returns Created reminder
 */
export async function createReminder(
  appointmentId: string,
  appointmentStartTime: Date,
  reminderType: ReminderType = ReminderType.TWENTY_FOUR_HOUR
): Promise<{
  id: string;
  appointmentId: string;
  scheduledFor: Date;
  reminderType: ReminderType;
}> {
  // Calculate when to send the reminder
  const hoursBefore = reminderType === ReminderType.TWENTY_FOUR_HOUR ? 24 : 1;
  const scheduledFor = new Date(
    appointmentStartTime.getTime() - hoursBefore * 60 * 60 * 1000
  );

  // Don't schedule reminders in the past
  if (scheduledFor < new Date()) {
    logger.warn("Cannot schedule reminder in the past", {
      appointmentId,
      scheduledFor,
      appointmentStartTime,
    });
    throw createValidationError(
      "Cannot schedule reminder in the past. Appointment is too soon."
    );
  }

  const reminder = await query((prisma) =>
    prisma.reminder.create({
      data: {
        appointmentId,
        scheduledFor,
        reminderType: reminderType as PrismaReminderType,
      },
      select: {
        id: true,
        appointmentId: true,
        scheduledFor: true,
        reminderType: true,
      },
    })
  );

  logger.info("Reminder created", {
    reminderId: reminder.id,
    appointmentId,
    scheduledFor,
    reminderType,
  });

  return {
    ...reminder,
    reminderType: reminder.reminderType as ReminderType,
  };
}

/**
 * Cancels a reminder for an appointment
 * @param appointmentId Appointment ID
 * @returns Updated reminder or null if not found
 */
export async function cancelReminder(
  appointmentId: string
): Promise<{ id: string; cancelledAt: Date | null } | null> {
  const reminder = await query((prisma) =>
    prisma.reminder.findUnique({
      where: { appointmentId },
    })
  );

  if (!reminder) {
    logger.warn("Reminder not found for appointment", { appointmentId });
    return null;
  }

  // Don't cancel if already sent or cancelled
  if (reminder.sentAt || reminder.cancelledAt) {
    logger.info("Reminder already processed", {
      reminderId: reminder.id,
      appointmentId,
      sentAt: reminder.sentAt,
      cancelledAt: reminder.cancelledAt,
    });
    return null;
  }

  const updated = await query((prisma) =>
    prisma.reminder.update({
      where: { id: reminder.id },
      data: { cancelledAt: new Date() },
      select: {
        id: true,
        cancelledAt: true,
      },
    })
  );

  logger.info("Reminder cancelled", {
    reminderId: updated.id,
    appointmentId,
  });

  return updated;
}

/**
 * Updates a reminder when an appointment is rescheduled
 * @param appointmentId Appointment ID
 * @param newAppointmentStartTime New appointment start time
 * @param reminderType Type of reminder (default: 24 hours before)
 * @returns Updated reminder
 */
export async function updateReminderForReschedule(
  appointmentId: string,
  newAppointmentStartTime: Date,
  reminderType: ReminderType = ReminderType.TWENTY_FOUR_HOUR
): Promise<{
  id: string;
  appointmentId: string;
  scheduledFor: Date;
  reminderType: ReminderType;
} | null> {
  const reminder = await query((prisma) =>
    prisma.reminder.findUnique({
      where: { appointmentId },
    })
  );

  // If no reminder exists, create one
  if (!reminder) {
    logger.info("No existing reminder found, creating new one", {
      appointmentId,
    });
    return createReminder(appointmentId, newAppointmentStartTime, reminderType);
  }

  // If already sent or cancelled, create a new one
  if (reminder.sentAt || reminder.cancelledAt) {
    logger.info("Existing reminder already processed, creating new one", {
      appointmentId,
      oldReminderId: reminder.id,
    });
    // Cancel the old one and create a new one
    await query((prisma) =>
      prisma.reminder.update({
        where: { id: reminder.id },
        data: { cancelledAt: new Date() },
      })
    );
    return createReminder(appointmentId, newAppointmentStartTime, reminderType);
  }

  // Calculate new scheduled time
  const hoursBefore = reminderType === ReminderType.TWENTY_FOUR_HOUR ? 24 : 1;
  const scheduledFor = new Date(
    newAppointmentStartTime.getTime() - hoursBefore * 60 * 60 * 1000
  );

  // Don't schedule reminders in the past
  if (scheduledFor < new Date()) {
    logger.warn("Cannot reschedule reminder to the past, cancelling", {
      appointmentId,
      scheduledFor,
      newAppointmentStartTime,
    });
    await query((prisma) =>
      prisma.reminder.update({
        where: { id: reminder.id },
        data: { cancelledAt: new Date() },
      })
    );
    return null;
  }

  const updated = await query((prisma) =>
    prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        scheduledFor,
        reminderType: reminderType as PrismaReminderType,
        cancelledAt: null, // Reset cancellation if it was cancelled
      },
      select: {
        id: true,
        appointmentId: true,
        scheduledFor: true,
        reminderType: true,
      },
    })
  );

  logger.info("Reminder updated for reschedule", {
    reminderId: updated.id,
    appointmentId,
    scheduledFor,
    reminderType,
  });

  return {
    ...updated,
    reminderType: updated.reminderType as ReminderType,
  };
}

/**
 * Gets reminders that are due to be sent
 * @param beforeTime Get reminders scheduled before this time (default: now)
 * @returns Array of reminders ready to send
 */
export async function getDueReminders(beforeTime?: Date): Promise<
  Array<{
    id: string;
    appointmentId: string;
    scheduledFor: Date;
    reminderType: ReminderType;
  }>
> {
  const now = beforeTime || new Date();

  const reminders = await query((prisma) =>
    prisma.reminder.findMany({
      where: {
        scheduledFor: { lte: now },
        sentAt: null,
        cancelledAt: null,
      },
      select: {
        id: true,
        appointmentId: true,
        scheduledFor: true,
        reminderType: true,
      },
      orderBy: {
        scheduledFor: "asc",
      },
    })
  );

  return reminders.map((r) => ({
    ...r,
    reminderType: r.reminderType as ReminderType,
  }));
}

/**
 * Marks a reminder as sent
 * @param reminderId Reminder ID
 * @returns Updated reminder
 */
export async function markReminderAsSent(
  reminderId: string
): Promise<{ id: string; sentAt: Date | null }> {
  try {
    const reminder = await query((prisma) =>
      prisma.reminder.findUnique({
        where: { id: reminderId },
      })
    );

    if (!reminder) {
      throw createNotFoundError("Reminder not found");
    }

    if (reminder.sentAt) {
      logger.warn("Reminder already marked as sent", { reminderId });
      return {
        id: reminder.id,
        sentAt: reminder.sentAt,
      };
    }

    const updated = await query((prisma) =>
      prisma.reminder.update({
        where: { id: reminderId },
        data: { sentAt: new Date() },
        select: {
          id: true,
          sentAt: true,
        },
      })
    );

    logger.info("Reminder marked as sent", {
      reminderId: updated.id,
      sentAt: updated.sentAt,
    });

    return updated;
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Reminder not found");
    }
    // If it's already our custom error, re-throw it
    if (error && typeof error === "object" && "message" in error) {
      const err = error as { message?: string };
      if (err.message?.includes("Reminder not found")) {
        throw error;
      }
    }
    // For other errors (like database connection issues), re-throw as-is
    throw error;
  }
}
