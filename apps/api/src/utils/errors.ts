/**
 * Error structure type
 */
export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "statusCode" in error &&
    typeof (error as AppError).code === "string" &&
    typeof (error as AppError).message === "string" &&
    typeof (error as AppError).statusCode === "number"
  );
}

/**
 * Creates a validation error (400)
 */
export function createValidationError(
  message: string,
  details?: unknown
): AppError {
  return {
    code: "VALIDATION_ERROR",
    message,
    statusCode: 400,
    details,
  };
}

/**
 * Creates an authentication error (401)
 */
export function createAuthenticationError(
  message: string = "Authentication required",
  details?: unknown
): AppError {
  return {
    code: "AUTHENTICATION_ERROR",
    message,
    statusCode: 401,
    details,
  };
}

/**
 * Creates an authorization error (403)
 */
export function createAuthorizationError(
  message: string = "Insufficient permissions",
  details?: unknown
): AppError {
  return {
    code: "AUTHORIZATION_ERROR",
    message,
    statusCode: 403,
    details,
  };
}

/**
 * Creates a not found error (404)
 */
export function createNotFoundError(
  resource: string = "Resource",
  details?: unknown
): AppError {
  return {
    code: "NOT_FOUND",
    message: `${resource} not found`,
    statusCode: 404,
    details,
  };
}

/**
 * Creates a conflict error (409)
 */
export function createConflictError(
  message: string,
  details?: unknown
): AppError {
  return {
    code: "CONFLICT_ERROR",
    message,
    statusCode: 409,
    details,
  };
}

/**
 * Creates a rate limit error (429)
 */
export function createRateLimitError(
  message: string = "Too many requests",
  details?: unknown
): AppError {
  return {
    code: "RATE_LIMIT_ERROR",
    message,
    statusCode: 429,
    details,
  };
}

/**
 * Creates a generic application error (500)
 */
export function createAppError(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: unknown
): AppError {
  return {
    code,
    message,
    statusCode,
    details,
  };
}
