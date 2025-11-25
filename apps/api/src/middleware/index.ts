/**
 * Middleware exports
 * All Express middleware will be exported from here
 */

export { corsMiddleware } from "./cors.middleware";
export { errorHandler, notFoundHandler } from "./error.middleware";
export { requestLogger } from "./request-logger.middleware";
export { authenticate, requireRole } from "./auth.middleware";
export type { AuthenticatedRequest } from "./auth.middleware";
// TODO: Add middleware exports as they are created
// export { validateRequest } from './validation.middleware';
// export { rateLimiter } from './rateLimit.middleware';
