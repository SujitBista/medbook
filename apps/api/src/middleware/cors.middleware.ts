import cors, { CorsOptions } from "cors";
import { Request, Response, NextFunction } from "express";
import { env, normalizeOrigin } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Creates a standardized CORS error response
 */
function createCorsErrorResponse(
  message: string,
  receivedOrigin?: string | null
) {
  // Check NODE_ENV dynamically for each request to allow test overrides
  const isDev = (process.env.NODE_ENV || "development") === "development";

  const response: {
    success: false;
    error: {
      code: "CORS_ERROR";
      message: string;
      details?: string;
    };
  } = {
    success: false,
    error: {
      code: "CORS_ERROR",
      message: "Origin not allowed by CORS policy",
    },
  };

  // In development, provide helpful debugging information
  if (isDev) {
    const details: string[] = [message];

    if (receivedOrigin) {
      details.push(`Received origin: ${receivedOrigin}`);
    } else {
      details.push("No Origin header was sent with the request");
    }

    details.push(`Allowed origins: ${env.corsOrigins.join(", ")}`);

    if (!receivedOrigin) {
      if (isDev) {
        details.push(
          "Note: No-origin requests are automatically allowed in development mode"
        );
      } else {
        details.push(
          "Tip: Set CORS_ALLOW_NO_ORIGIN=true to allow requests without Origin header"
        );
      }
    }

    response.error.details = details.join(". ");
  }

  return response;
}

/**
 * CORS configuration for Express app
 * Strict whitelist-based CORS with proper error handling
 * Origins are normalized once during env parsing
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // In test environment, only bypass CORS if CORS_ALLOW_ALL_ORIGINS_IN_TEST is set
    // This allows CORS tests to run properly while bypassing CORS for integration tests
    const isTest = (process.env.NODE_ENV || "development") === "test";
    const allowAllInTest =
      process.env.CORS_ALLOW_ALL_ORIGINS_IN_TEST === "true";
    if (isTest && allowAllInTest) {
      return callback(null, true);
    }

    // Check NODE_ENV and CORS_ALLOW_NO_ORIGIN dynamically for each request to allow test overrides
    const isDev = (process.env.NODE_ENV || "development") === "development";
    const corsAllowNoOrigin = process.env.CORS_ALLOW_NO_ORIGIN === "true";

    // Handle requests with no origin
    if (!origin) {
      // In development, automatically allow no-origin requests (for server-to-server calls)
      // In production, require explicit CORS_ALLOW_NO_ORIGIN=true for security
      if (isDev || corsAllowNoOrigin) {
        if (isDev) {
          logger.debug("CORS: Allowing no-origin request (development mode)");
        }
        return callback(null, true);
      }
      // Log and deny no-origin requests in production by default
      logger.warn("CORS: Request denied - No origin header");
      return callback(new Error("CORS: Origin header required"), false);
    }

    // Handle explicit "null" origin (e.g., from file:// protocol)
    if (origin === "null") {
      // Check CORS_ALLOW_NULL_ORIGIN dynamically for each request to allow test overrides
      const corsAllowNullOrigin = process.env.CORS_ALLOW_NULL_ORIGIN === "true";
      if (corsAllowNullOrigin) {
        return callback(null, true);
      }
      logger.warn("CORS: Request denied - Null origin not allowed");
      return callback(new Error("CORS: Null origin not allowed"), false);
    }

    // Origins are already normalized in env.corsOrigins
    // Normalize the incoming origin for comparison using the same function
    const normalizedOrigin = normalizeOrigin(origin);

    // Allow Vercel preview URLs automatically (*.vercel.app)
    // This enables Vercel preview deployments to work without adding each URL to whitelist
    // Supports both production (medbook-lake.vercel.app) and preview URLs like:
    // - https://medbook-git-<branch>-<username>.vercel.app
    // - https://medbook-<hash>.vercel.app
    if (normalizedOrigin.endsWith(".vercel.app")) {
      logger.debug(`CORS: Allowing Vercel preview URL: ${origin}`);
      return callback(null, true);
    }

    // Check if origin is in whitelist
    if (env.corsOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Log denied origin (without exposing full origin in production)
    // Check NODE_ENV dynamically for each request to allow test overrides
    const isDevForLogging =
      (process.env.NODE_ENV || "development") === "development";
    if (isDevForLogging) {
      logger.warn(`CORS: Request denied - Origin "${origin}" not in whitelist`);
      logger.debug(`CORS: Allowed origins: ${env.corsOrigins.join(", ")}`);
    } else {
      logger.warn("CORS: Request denied - Origin not in whitelist");
    }

    // Return error that will be handled by error middleware
    return callback(new Error("CORS: Origin not allowed"), false);
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
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
  // Capture the origin header before passing to cors middleware
  const receivedOrigin = req.headers.origin || null;

  cors(corsOptions)(req, res, (err) => {
    if (err) {
      // Check NODE_ENV dynamically for each request to allow test overrides
      const isDev = (process.env.NODE_ENV || "development") === "development";

      // Log the CORS error
      const isPreflight = req.method === "OPTIONS";
      if (isPreflight) {
        logger.error(`CORS: Preflight request denied - ${err.message}`);
        if (receivedOrigin) {
          logger.debug(`CORS: Preflight origin: ${receivedOrigin}`);
        }
      } else {
        logger.error(`CORS: Request denied - ${err.message}`);
        if (receivedOrigin) {
          logger.debug(`CORS: Request origin: ${receivedOrigin}`);
        }
      }

      if (isDev) {
        logger.debug(`CORS: Allowed origins: ${env.corsOrigins.join(", ")}`);
      }

      // Return 403 Forbidden with proper error response
      // This works for both regular requests and OPTIONS preflight
      res
        .status(403)
        .json(createCorsErrorResponse(err.message, receivedOrigin));
      return;
    }

    // For OPTIONS preflight requests, cors middleware sends the response
    // For regular requests, continue to next middleware
    if (req.method !== "OPTIONS") {
      next();
    }
  });
}
