/**
 * Authentication controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { CreateUserInput } from "@medbook/types";
import { createValidationError } from "../utils";

/**
 * Request body for registration
 * Note: role is NOT accepted - public registration always creates PATIENT
 * Doctors and Admins must be onboarded by existing admins
 */
interface RegisterRequestBody {
  email: string;
  password: string;
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
    const { email, password } = req.body;

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
    // Note: role is NOT included - defaults to PATIENT in registerUser service
    // This prevents privilege escalation - only admins can create DOCTOR/ADMIN accounts
    const input: CreateUserInput = {
      email,
      password,
      // role is intentionally omitted - public registration always creates PATIENT
    };

    // Register user
    const result = await registerUser(input);

    // Return response matching NextAuth expectations
    // NextAuth expects: { user: { id, email, role, ... } } at top level
    // We maintain success field for API consistency but NextAuth reads data.user
    res.status(201).json({
      success: true,
      user: result.user,
      // Token removed - NextAuth handles session management internally
    });
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

    // Return response matching NextAuth expectations
    // NextAuth expects: { user: { id, email, role, ... } } at top level
    // We maintain success field for API consistency but NextAuth reads data.user
    res.status(200).json({
      success: true,
      user: result.user,
      // Token removed - NextAuth handles session management internally
    });
  } catch (error) {
    next(error);
  }
}
