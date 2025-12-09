// Load environment variables from .env file before anything else
// This ensures DATABASE_URL is available when Prisma Client is initialized
import { config } from "dotenv";

// Load .env from the api package root (where package.json is located)
config();

import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

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
}

// Start the server
startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
