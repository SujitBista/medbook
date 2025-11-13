/**
 * Utility functions
 * Shared utilities for the backend API
 */

/**
 * Creates a standardized API response
 */
export function createApiResponse<T>(
  data: T,
  success = true
): { success: boolean; data: T } {
  return {
    success,
    data,
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): { success: boolean; error: { code: string; message: string; details?: unknown } } {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

