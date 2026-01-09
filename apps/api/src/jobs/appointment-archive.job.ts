/**
 * Appointment archive background job
 * Runs periodically to archive expired appointments
 * An appointment is considered expired when its endTime has passed the current date and time
 */

import { query } from "@app/db";
import { logger } from "../utils/logger";

/**
 * Archives expired appointments
 * Finds all appointments where endTime < now() AND isArchived = false
 * Updates them to set isArchived = true
 * @returns Number of appointments archived
 */
export async function archiveExpiredAppointments(): Promise<number> {
  logger.info("Starting appointment archive job");

  try {
    const now = new Date();

    // Find all expired appointments that haven't been archived yet
    const expiredAppointments = await query((prisma) =>
      prisma.appointment.findMany({
        where: {
          endTime: { lt: now },
          isArchived: false,
        },
        select: {
          id: true,
        },
      })
    );

    if (expiredAppointments.length === 0) {
      logger.info("No expired appointments to archive");
      return 0;
    }

    logger.info(
      `Found ${expiredAppointments.length} expired appointments to archive`
    );

    // Update all expired appointments to archived
    const result = await query((prisma) =>
      prisma.appointment.updateMany({
        where: {
          endTime: { lt: now },
          isArchived: false,
        },
        data: {
          isArchived: true,
        },
      })
    );

    logger.info("Appointment archive job completed", {
      archived: result.count,
      totalFound: expiredAppointments.length,
    });

    return result.count;
  } catch (error) {
    logger.error("Appointment archive job failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Runs the job if this file is executed directly
 * Usage: ts-node src/jobs/appointment-archive.job.ts
 */
if (require.main === module) {
  archiveExpiredAppointments()
    .then((count) => {
      logger.info("Appointment archive job completed", { archived: count });
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Appointment archive job failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    });
}
