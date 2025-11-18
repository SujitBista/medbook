import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError } from '../utils/errors';
import { createErrorResponse } from '../utils';
import { logger } from '../utils/logger';
import { isDevelopment } from '../config/env';

/**
 * Handles 404 Not Found for unmatched routes
 * Must be placed after all route handlers
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error: AppError = {
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
  };
  next(error);
}

/**
 * Global error handling middleware
 * Catches all errors and returns standardized error responses
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  if (err instanceof Error) {
    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.error('Error occurred:', {
      error: err,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  // Handle known AppError instances
  if (isAppError(err)) {
    const response = createErrorResponse(
      err.code,
      err.message,
      // Only include details in development or if explicitly provided
      isDevelopment ? err.details : undefined
    );

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Express JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    const response = createErrorResponse(
      'INVALID_JSON',
      'Invalid JSON in request body',
      isDevelopment ? { originalError: err.message } : undefined
    );
    res.status(400).json(response);
    return;
  }

  // Handle standard Error instances
  if (err instanceof Error) {
    const response = createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      isDevelopment
        ? {
            message: err.message,
            stack: err.stack,
          }
        : undefined
    );

    res.status(500).json(response);
    return;
  }

  // Handle unknown error types
  const response = createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred',
    isDevelopment ? { error: err } : undefined
  );

  res.status(500).json(response);
}

