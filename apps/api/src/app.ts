import express, { Express } from 'express';
import { env } from './config/env';
import routes from './routes';
import { corsMiddleware, errorHandler, notFoundHandler } from './middleware';

/**
 * Creates and configures the Express application
 * @returns Configured Express app instance
 */
export function createApp(): Express {
  const app = express();

  // CORS middleware - must be before other middleware
  app.use(corsMiddleware);

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'MedBook API Server',
      version: '1.0.0',
      environment: env.nodeEnv,
    });
  });

  // API routes
  app.use('/api/v1', routes);

  // 404 handler - must be after all routes
  app.use(notFoundHandler);

  // Error handler - must be last
  app.use(errorHandler);

  return app;
}

