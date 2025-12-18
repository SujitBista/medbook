/**
 * Appointment reminder background job
 * Runs periodically to send appointment reminder emails
 */

import { query } from "@app/db";
import {
  getDueReminders,
  markReminderAsSent,
} from "../services/reminder.service";
import { sendAppointmentReminderEmail } from "../services/email.service";
import { logger } from "../utils/logger";

/**
 * Helper to get appointment details for reminder email
 */
async function getAppointmentDetailsForReminder(
  appointmentId: string
): Promise<{
  patientEmail: string;
  patientName?: string;
  doctorName: string;
  doctorSpecialization?: string;
  appointmentDate: Date;
  appointmentEndTime: Date;
} | null> {
  const appointment = await query((prisma) =>
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        startTime: true,
        endTime: true,
        patient: {
          select: {
            email: true,
          },
        },
        doctor: {
          select: {
            specialization: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    })
  );

  if (!appointment) {
    return null;
  }

  // Use email username as patient/doctor name (can be enhanced later with actual name field)
  const patientName = appointment.patient.email.split("@")[0];
  const doctorName = appointment.doctor.user.email.split("@")[0];

  return {
    patientEmail: appointment.patient.email,
    patientName,
    doctorName,
    doctorSpecialization: appointment.doctor.specialization || undefined,
    appointmentDate: appointment.startTime,
    appointmentEndTime: appointment.endTime,
  };
}

/**
 * Processes due reminders and sends reminder emails
 * @returns Number of reminders processed
 */
export async function processReminders(): Promise<number> {
  logger.info("Starting reminder processing job");

  try {
    // Get all reminders that are due
    const dueReminders = await getDueReminders();

    if (dueReminders.length === 0) {
      logger.info("No reminders due to be sent");
      return 0;
    }

    logger.info(`Found ${dueReminders.length} reminders due to be sent`);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const reminder of dueReminders) {
      try {
        // Get appointment details
        const appointmentDetails = await getAppointmentDetailsForReminder(
          reminder.appointmentId
        );

        if (!appointmentDetails) {
          logger.warn("Appointment not found for reminder", {
            reminderId: reminder.id,
            appointmentId: reminder.appointmentId,
          });
          // Mark as sent to avoid retrying
          await markReminderAsSent(reminder.id);
          processedCount++;
          continue;
        }

        // Check if appointment is still valid (not cancelled or completed)
        const appointment = await query((prisma) =>
          prisma.appointment.findUnique({
            where: { id: reminder.appointmentId },
            select: {
              status: true,
            },
          })
        );

        if (!appointment) {
          logger.warn("Appointment not found, marking reminder as sent", {
            reminderId: reminder.id,
            appointmentId: reminder.appointmentId,
          });
          await markReminderAsSent(reminder.id);
          processedCount++;
          continue;
        }

        // Don't send reminders for cancelled or completed appointments
        if (
          appointment.status === "CANCELLED" ||
          appointment.status === "COMPLETED"
        ) {
          logger.info(
            "Appointment is cancelled or completed, cancelling reminder",
            {
              reminderId: reminder.id,
              appointmentId: reminder.appointmentId,
              status: appointment.status,
            }
          );
          // Cancel the reminder instead of marking as sent
          await query((prisma) =>
            prisma.reminder.update({
              where: { id: reminder.id },
              data: { cancelledAt: new Date() },
            })
          );
          processedCount++;
          continue;
        }

        // Calculate hours until appointment
        const now = new Date();
        const hoursUntil = Math.round(
          (appointmentDetails.appointmentDate.getTime() - now.getTime()) /
            (1000 * 60 * 60)
        );

        // Send reminder email
        const emailResult = await sendAppointmentReminderEmail({
          patientEmail: appointmentDetails.patientEmail,
          patientName: appointmentDetails.patientName,
          doctorName: appointmentDetails.doctorName,
          doctorSpecialization: appointmentDetails.doctorSpecialization,
          appointmentDate: appointmentDetails.appointmentDate,
          appointmentEndTime: appointmentDetails.appointmentEndTime,
          appointmentId: reminder.appointmentId,
          hoursUntil,
        });

        if (emailResult.success) {
          // Mark reminder as sent
          await markReminderAsSent(reminder.id);
          successCount++;
          logger.info("Reminder email sent successfully", {
            reminderId: reminder.id,
            appointmentId: reminder.appointmentId,
            patientEmail: appointmentDetails.patientEmail,
            hoursUntil,
          });
        } else {
          errorCount++;
          logger.error("Failed to send reminder email", {
            reminderId: reminder.id,
            appointmentId: reminder.appointmentId,
            error: emailResult.error,
          });
          // Don't mark as sent if email failed - will retry on next run
        }

        processedCount++;
      } catch (error) {
        errorCount++;
        logger.error("Error processing reminder", {
          reminderId: reminder.id,
          appointmentId: reminder.appointmentId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't mark as sent if there was an error - will retry on next run
      }
    }

    logger.info("Reminder processing job completed", {
      total: dueReminders.length,
      processed: processedCount,
      successful: successCount,
      errors: errorCount,
    });

    return processedCount;
  } catch (error) {
    logger.error("Reminder processing job failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Runs the job if this file is executed directly
 * Usage: ts-node src/jobs/reminder.job.ts
 */
if (require.main === module) {
  processReminders()
    .then((count) => {
      logger.info("Reminder processing job completed", { processed: count });
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Reminder processing job failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    });
}
