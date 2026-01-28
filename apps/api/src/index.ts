// Load environment variables from .env file before anything else
// This ensures DATABASE_URL is available when Prisma Client is initialized
import { config } from "dotenv";

// Load .env from the api package root (where package.json is located)
// Load .env.local after .env so it can override values (higher priority)
config(); // Loads .env
config({ path: ".env.local" }); // Loads .env.local (overrides .env values)

import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import * as cron from "node-cron";
import { processReminders } from "./jobs/reminder.job";
import { archiveExpiredAppointments } from "./jobs/appointment-archive.job";

/**
 * Server entry point
 * Creates Express app and starts the server
 */
async function startServer() {
  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`🚀 Server is running on port ${env.port}`);
    logger.info(`📦 Environment: ${env.nodeEnv}`);
    logger.info(`🌐 API URL: ${env.apiUrl}`);
  });

  // Set up reminder job to run every hour
  // Cron format: minute hour day month day-of-week
  // "0 * * * *" means: at minute 0 of every hour
  cron.schedule("0 * * * *", async () => {
    logger.info("Running scheduled reminder job");
    try {
      const count = await processReminders();
      logger.info(`Reminder job completed: ${count} reminders processed`);
    } catch (error) {
      logger.error("Reminder job failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  logger.info("Reminder job scheduled to run every hour");

  // Set up archive job to run daily at 2 AM
  // Cron format: minute hour day month day-of-week
  // "0 2 * * *" means: at minute 0 of hour 2 (2 AM) every day
  cron.schedule("0 2 * * *", async () => {
    logger.info("Running scheduled appointment archive job");
    try {
      const count = await archiveExpiredAppointments();
      logger.info(`Archive job completed: ${count} appointments archived`);
    } catch (error) {
      logger.error("Archive job failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  logger.info("Appointment archive job scheduled to run daily at 2 AM");
}

// Start the server
startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
