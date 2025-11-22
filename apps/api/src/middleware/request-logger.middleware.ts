import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Request logging middleware
 * Logs incoming HTTP requests with method, URL, status code, and response time
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  // Log request start
  logger.info(`${method} ${originalUrl} - ${ip}`);

  // Listen for response finish event to log response details
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response with appropriate log level based on status code
    if (statusCode >= 500) {
      logger.error(
        `${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${ip}`
      );
    } else if (statusCode >= 400) {
      logger.warn(
        `${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${ip}`
      );
    } else {
      logger.info(
        `${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${ip}`
      );
    }
  });

  next();
}


