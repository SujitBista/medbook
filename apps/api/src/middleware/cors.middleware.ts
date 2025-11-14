import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import { env, isDevelopment } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Creates a standardized CORS error response
 */
function createCorsErrorResponse(message: string) {
  return {
    success: false,
    error: {
      code: 'CORS_ERROR',
      message: 'Origin not allowed by CORS policy',
      // Only expose details in development
      ...(isDevelopment && { details: message }),
    },
  };
}

/**
 * CORS configuration for Express app
 * Strict whitelist-based CORS with proper error handling
 * Origins are normalized once during env parsing
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Handle requests with no origin
    if (!origin) {
      if (env.corsAllowNoOrigin) {
        return callback(null, true);
      }
      // Log and deny no-origin requests by default
      logger.warn('CORS: Request denied - No origin header');
      return callback(new Error('CORS: Origin header required'), false);
    }

    // Handle explicit "null" origin (e.g., from file:// protocol)
    if (origin === 'null') {
      if (env.corsAllowNullOrigin) {
        return callback(null, true);
      }
      logger.warn('CORS: Request denied - Null origin not allowed');
      return callback(new Error('CORS: Null origin not allowed'), false);
    }

    // Origins are already normalized in env.corsOrigins
    // Normalize the incoming origin for comparison
    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');

    // Check if origin is in whitelist
    if (env.corsOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Log denied origin (without exposing full origin in production)
    if (isDevelopment) {
      logger.warn(`CORS: Request denied - Origin "${origin}" not in whitelist`);
      logger.debug(`CORS: Allowed origins: ${env.corsOrigins.join(', ')}`);
    } else {
      logger.warn('CORS: Request denied - Origin not in whitelist');
    }

    // Return error that will be handled by error middleware
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

/**
 * CORS middleware with error handling
 * Returns 403 Forbidden for denied origins instead of bubbling errors
 * Handles both regular requests and OPTIONS preflight requests
 */
export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  cors(corsOptions)(req, res, (err) => {
    if (err) {
      // Log the CORS error
      const isPreflight = req.method === 'OPTIONS';
      if (isPreflight) {
        logger.error(`CORS: Preflight request denied - ${err.message}`);
      } else {
        logger.error(`CORS: Request denied - ${err.message}`);
      }

      // Return 403 Forbidden with proper error response
      // This works for both regular requests and OPTIONS preflight
      res.status(403).json(createCorsErrorResponse(err.message));
      return;
    }

    // For OPTIONS preflight requests, cors middleware sends the response
    // For regular requests, continue to next middleware
    if (req.method !== 'OPTIONS') {
      next();
    }
  });
}

