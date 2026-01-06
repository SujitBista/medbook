/**
 * Authentication middleware
 * Handles JWT token verification and role-based access control
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { UserRole } from "@medbook/types";
import {
  createAuthenticationError,
  createAuthorizationError,
} from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

/**
 * Extracts JWT token from Authorization header
 * Supports: "Bearer <token>" format
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user information to request
 * Use this middleware on protected routes
 *
 * @example
 * router.get('/protected', authenticate, handler);
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from Authorization header
    const token = extractToken(req);

    if (!token) {
      const error = createAuthenticationError(
        "Authentication token is required. Please provide a valid Bearer token."
      );
      next(error);
      return;
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      logger.warn("Token verification failed", {
        url: req.originalUrl,
        method: req.method,
        hasToken: !!token,
        tokenLength: token?.length,
      });
      const error = createAuthenticationError("Invalid or expired token");
      next(error);
      return;
    }

    // Attach user information to request
    req.user = {
      id: payload.id,
      role: payload.role,
    };

    next();
  } catch (error) {
    const authError = createAuthenticationError("Authentication failed");
    next(authError);
  }
}

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has one of the required roles
 * Must be used after authenticate() middleware
 *
 * @param roles Required roles (user must have at least one)
 * @returns Middleware function
 *
 * @example
 * router.get('/admin', authenticate, requireRole('ADMIN'), handler);
 * router.get('/doctor', authenticate, requireRole('DOCTOR', 'ADMIN'), handler);
 */
export function requireRole(...roles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    // Ensure user is authenticated (should be set by authenticate middleware)
    if (!req.user) {
      const error = createAuthenticationError(
        "Authentication required. Use authenticate() middleware first."
      );
      next(error);
      return;
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      const error = createAuthorizationError(
        `Access denied. Required role: ${roles.join(" or ")}`
      );
      next(error);
      return;
    }

    next();
  };
}
