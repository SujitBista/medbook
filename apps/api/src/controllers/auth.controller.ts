/**
 * Authentication controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { CreateUserInput, UserRole } from "@medbook/types";
import { createApiResponse, createValidationError } from "../utils";

/**
 * Request body for registration
 */
interface RegisterRequestBody {
  email: string;
  password: string;
  role?: UserRole;
}

/**
 * Request body for login
 */
interface LoginRequestBody {
  email: string;
  password: string;
}

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export async function register(
  req: Request<unknown, unknown, RegisterRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      const error = createValidationError("Email and password are required");
      next(error);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = createValidationError("Invalid email format");
      next(error);
      return;
    }

    // Create user input
    const input: CreateUserInput = {
      email,
      password,
      role,
    };

    // Register user
    const result = await registerUser(input);

    // Return response (matching frontend expectations)
    // Frontend expects: { success: true, data: { user: {...} } }
    // But accesses data.user, so we need data.user at top level of data
    res.status(201).json(
      createApiResponse({
        user: result.user,
        // Note: Token is included but NextAuth will handle session management
        token: result.token,
      })
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 * POST /api/v1/auth/login
 */
export async function login(
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      const error = createValidationError("Email and password are required");
      next(error);
      return;
    }

    // Login user
    const result = await loginUser(email, password);

    // Return response (matching frontend expectations)
    // Frontend expects: { success: true, data: { user: {...} } }
    // But accesses data.user, so we need data.user at top level of data
    res.status(200).json(
      createApiResponse({
        user: result.user,
        // Note: Token is included but NextAuth will handle session management
        token: result.token,
      })
    );
  } catch (error) {
    next(error);
  }
}
