// Load environment variables from .env file before anything else
// This ensures DATABASE_URL is available when Prisma Client is initialized
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Handle both CommonJS and ESM environments
// In tsx watch (ESM), __dirname might not exist, so we need to derive it
let envPath: string;
if (typeof __dirname !== "undefined") {
  // CommonJS environment
  envPath = resolve(__dirname, "../.env");
} else {
  // ESM environment (tsx watch) - use import.meta.url
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  envPath = resolve(__dirname, "../.env");
}
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
