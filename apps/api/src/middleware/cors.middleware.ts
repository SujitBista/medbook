import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import { env, isDevelopment } from '../config/env';

/**
 * Normalizes an origin URL (lowercase, no trailing slash)
 */
function normalizeOrigin(origin: string): string {
  return origin.toLowerCase().replace(/\/$/, '');
}

/**
 * CORS configuration for Express app
 * Strict whitelist-based CORS with proper error handling
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Handle requests with no origin
    if (!origin) {
      if (env.corsAllowNoOrigin) {
        return callback(null, true);
      }
      // Log and deny no-origin requests by default
      console.warn('[CORS] Request denied: No origin header');
      return callback(new Error('CORS: Origin header required'), false);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    const normalizedAllowedOrigins = env.corsOrigins.map(normalizeOrigin);

    // Check if origin is in whitelist
    if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Log denied origin (without exposing full origin in production)
    if (isDevelopment) {
      console.warn(`[CORS] Request denied: Origin "${origin}" not in whitelist`);
      console.warn(`[CORS] Allowed origins: ${env.corsOrigins.join(', ')}`);
    } else {
      console.warn(`[CORS] Request denied: Origin not in whitelist`);
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
 */
export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  cors(corsOptions)(req, res, (err) => {
    if (err) {
      // Log the CORS error
      console.error('[CORS Error]', err.message);

      // Return 403 Forbidden with proper error response
      res.status(403).json({
        success: false,
        error: {
          code: 'CORS_ERROR',
          message: 'Origin not allowed by CORS policy',
          // Only expose details in development
          ...(isDevelopment && { details: err.message }),
        },
      });
      return;
    }
    next();
  });
}

