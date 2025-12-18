/**
 * Rate limiting middleware
 * Provides a simple in-memory rate limiter for Express.
 *
 * NOTE: This implementation is suitable for a single-instance deployment
 * and testing environments. For distributed deployments, a centralized
 * store (Redis, etc.) should be used instead.
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { createRateLimitError } from "../utils/errors";
import { env } from "../config/env";

/**
 * Options for the rate limiter
 */
export interface RateLimitOptions {
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Maximum number of requests allowed per key within the window
   */
  maxRequests: number;
  /**
   * Function to extract a key from the request (e.g., IP, user ID)
   * Defaults to using the request IP address
   */
  keyGenerator?: (req: Request) => string;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

/**
 * Creates a configurable rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const windowMs =
    options.windowMs && options.windowMs > 0 ? options.windowMs : 60_000;
  const maxRequests =
    options.maxRequests && options.maxRequests > 0 ? options.maxRequests : 100;
  const keyGenerator =
    options.keyGenerator ??
    ((req: Request) => {
      // Prefer X-Forwarded-For when behind proxies, fall back to req.ip
      const forwardedFor = req.headers["x-forwarded-for"];
      if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
        return forwardedFor.split(",")[0].trim();
      }
      return req.ip;
    });

  // In-memory store of request counts per key
  const hits = new Map<string, RateLimitState>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = keyGenerator(req);
    const existing = hits.get(key);

    if (!existing || now > existing.resetTime) {
      // New window for this key
      hits.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (existing.count < maxRequests) {
      existing.count += 1;
      next();
      return;
    }

    // Rate limit exceeded
    const error = createRateLimitError("Too many requests", {
      windowMs,
      maxRequests,
    });
    next(error);
  };
}

/**
 * Default/basic rate limiter used for the main API.
 * Values can be overridden via environment variables.
 */
const DEFAULT_WINDOW_MS = Number.parseInt(
  process.env.RATE_LIMIT_WINDOW_MS ?? "",
  10
);
const DEFAULT_MAX_REQUESTS = Number.parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS ?? "",
  10
);

export const basicRateLimiter = createRateLimiter({
  windowMs:
    Number.isFinite(DEFAULT_WINDOW_MS) && DEFAULT_WINDOW_MS > 0
      ? DEFAULT_WINDOW_MS
      : env.nodeEnv === "production"
        ? 60_000
        : 10 * 60_000, // More relaxed default in non-production
  maxRequests:
    Number.isFinite(DEFAULT_MAX_REQUESTS) && DEFAULT_MAX_REQUESTS > 0
      ? DEFAULT_MAX_REQUESTS
      : env.nodeEnv === "production"
        ? 100
        : 1_000,
});
