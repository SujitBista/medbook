// Load environment variables from .env file before anything else
// This ensures DATABASE_URL is available when Prisma Client is initialized
import { config } from "dotenv";
import { resolve } from "path";

// Use __dirname directly (available in CommonJS, which is our build target)
// For tsx watch in development, __dirname is available via Node.js
const envPath = resolve(__dirname, "../.env");
config({ path: envPath });

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
