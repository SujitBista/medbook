import { createApp } from './app';
import { env } from './config/env';

/**
 * Server entry point
 * Creates Express app and starts the server
 */
async function startServer() {
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`🚀 Server is running on port ${env.port}`);
    console.log(`📦 Environment: ${env.nodeEnv}`);
    console.log(`🌐 API URL: ${env.apiUrl}`);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

