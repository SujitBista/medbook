/**
 * Slot generation background job
 * Runs periodically to:
 * 1. Generate slots for new availabilities
 * 2. Generate future slots for recurring availabilities
 * 3. Clean up past slots
 */

import { query } from "@app/db";
import {
  generateSlotsFromAvailability,
  cleanupOldSlots,
} from "../services/slot.service";
import { logger } from "../utils/logger";

/**
 * Runs the slot generation job
 * Should be called periodically (e.g., daily via cron)
 */
export async function runSlotGenerationJob(): Promise<void> {
  logger.info("Starting slot generation job");

  try {
    // Get all active availabilities
    const now = new Date();
    const availabilities = await query((prisma) =>
      prisma.availability.findMany({
        where: {
          OR: [
            // One-time availabilities that haven't ended yet
            {
              isRecurring: false,
              endTime: { gte: now },
            },
            // Recurring availabilities
            {
              isRecurring: true,
              OR: [{ validTo: null }, { validTo: { gte: now } }],
            },
          ],
        },
      })
    );

    logger.info(`Found ${availabilities.length} active availabilities`);

    // Generate slots for each availability
    let totalSlotsGenerated = 0;
    for (const availability of availabilities) {
      try {
        const slots = await generateSlotsFromAvailability(
          availability.id,
          availability.doctorId
        );
        totalSlotsGenerated += slots.length;
      } catch (error) {
        logger.error("Failed to generate slots for availability", {
          availabilityId: availability.id,
          doctorId: availability.doctorId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info(`Generated ${totalSlotsGenerated} slots`);

    // Clean up old slots (slots that ended more than 1 day ago)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const deletedCount = await cleanupOldSlots(oneDayAgo);
    logger.info(`Cleaned up ${deletedCount} old slots`);

    logger.info("Slot generation job completed successfully");
  } catch (error) {
    logger.error("Slot generation job failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Runs the job if this file is executed directly
 * Usage: ts-node src/jobs/slot-generation.job.ts
 */
if (require.main === module) {
  runSlotGenerationJob()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Job failed:", error);
      process.exit(1);
    });
}
