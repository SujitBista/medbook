/**
 * Authentication controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { CreateUserInput } from "@medbook/types";
import { createValidationError } from "../utils";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

/**
 * Request body for registration
 * Note: role is NOT accepted - public registration always creates PATIENT
 * Doctors and Admins must be onboarded by existing admins
 */
interface RegisterRequestBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
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
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    // Validate required fields with field-specific errors
    const fieldErrors: Record<string, string> = {};
    if (!email) {
      fieldErrors.email = "Email is required";
    }
    if (!password) {
      fieldErrors.password = "Password is required";
    }
    if (!firstName || !firstName.trim()) {
      fieldErrors.firstName = "First name is required";
    }
    if (!lastName || !lastName.trim()) {
      fieldErrors.lastName = "Last name is required";
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      fieldErrors.phoneNumber = "Phone number is required";
    }

    if (Object.keys(fieldErrors).length > 0) {
      const error = createValidationError(
        "Please fill in all required fields",
        {
          errors: fieldErrors,
        }
      );
      next(error);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = createValidationError("Invalid email format", {
        errors: {
          email: "Please enter a valid email address",
        },
      });
      next(error);
      return;
    }

    // Create user input
    // Note: role is NOT included - defaults to PATIENT in registerUser service
    // This prevents privilege escalation - only admins can create DOCTOR/ADMIN accounts
    const input: CreateUserInput = {
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      // role is intentionally omitted - public registration always creates PATIENT
    };

    // Register user
    const result = await registerUser(input);

    // Return response with user and token
    // NextAuth expects: { user: { id, email, role, ... } } at top level (token is ignored)
    // API clients need the token to authenticate with Bearer token middleware
    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token,
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

    // Return response with user and token
    // NextAuth expects: { user: { id, email, role, ... } } at top level (token is ignored)
    // API clients need the token to authenticate with Bearer token middleware
    res.status(200).json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout user
 * POST /api/v1/auth/logout
 *
 * Note: Authentication is stateless and uses JWT tokens. Logging out on the
 * server simply means acknowledging the logout request so clients can clear
 * their stored tokens/session. No server-side session state is persisted.
 */
export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // At this point, authenticate middleware has already verified the token
    // and attached user information to the request.
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}
