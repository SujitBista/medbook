/**
 * Authentication service functions
 * Handles user registration and login business logic
 */

import { query, UserRole as PrismaUserRole } from "@app/db";
import { UserRole, UserWithoutPassword, CreateUserInput } from "@medbook/types";
import {
  hashPassword,
  comparePassword,
  generateToken,
  validatePassword,
} from "../utils";
import {
  createConflictError,
  createAuthenticationError,
  createValidationError,
} from "../utils/errors";
import { sendWelcomeEmail } from "./email.service";
import { logger } from "../utils/logger";

/**
 * Converts Prisma UserRole to @medbook/types UserRole
 */
function convertUserRole(role: PrismaUserRole): UserRole {
  return role as UserRole;
}

/**
 * Registration result
 */
export interface RegisterResult {
  user: UserWithoutPassword;
  token: string;
}

/**
 * Login result
 */
export interface LoginResult {
  user: UserWithoutPassword;
  token: string;
}

/**
 * Registers a new user
 * @param input User registration input
 * @returns User data and JWT token
 * @throws AppError if validation fails or user already exists
 */
export async function registerUser(
  input: CreateUserInput
): Promise<RegisterResult> {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role = UserRole.PATIENT,
  } = input;

  // Validate required fields
  const fieldErrors: Record<string, string> = {};
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
    throw createValidationError("Please fill in all required fields", {
      errors: fieldErrors,
    });
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    // Combine password validation errors into a single message for the password field
    const passwordErrorMessage = passwordValidation.errors.join(". ");
    throw createValidationError("Password does not meet requirements", {
      errors: {
        password: passwordErrorMessage,
      },
      // Also include raw errors array for detailed client-side handling if needed
      passwordErrors: passwordValidation.errors,
    });
  }

  // Check if user already exists (optimistic check)
  // Note: This check helps avoid unnecessary password hashing, but the actual
  // uniqueness is enforced by the database unique constraint. We catch the
  // Prisma unique constraint error (P2002) to handle race conditions.
  const existingUser = await query<{
    id: string;
    email: string;
    password: string;
    role: PrismaUserRole;
    mustResetPassword: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
  );

  if (existingUser) {
    throw createConflictError("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  // Wrap in try-catch to handle race condition: if two requests try to register
  // the same email simultaneously, the second will hit the unique constraint
  // and we need to return 409 Conflict instead of 500 Internal Server Error
  try {
    const user = await query<{
      id: string;
      email: string;
      role: PrismaUserRole;
      mustResetPassword: boolean;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: role as PrismaUserRole,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
        },
        select: {
          id: true,
          email: true,
          role: true,
          mustResetPassword: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    );

    // Generate JWT token
    const token = generateToken(user.id, convertUserRole(user.role));

    // Send welcome email (non-blocking)
    sendWelcomeEmail({
      email: user.email,
      role: convertUserRole(user.role),
    }).catch((error) => {
      // Log but don't fail registration if email fails
      logger.error("Failed to send welcome email", {
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

    return {
      user: {
        ...user,
        role: convertUserRole(user.role),
      },
      token,
    };
  } catch (error: unknown) {
    // Handle Prisma unique constraint violation (race condition)
    // P2002 is the error code for unique constraint violations
    // Check if error has Prisma error structure with code P2002
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      // Check if it's the email field that caused the conflict
      const prismaError = error as {
        code: string;
        meta?: { target?: unknown };
      };
      const target = prismaError.meta?.target;
      if (Array.isArray(target) && target.includes("email")) {
        throw createConflictError("User with this email already exists");
      }
    }
    // Re-throw other errors (they'll be handled by error middleware)
    throw error;
  }
}

/**
 * Authenticates a user and returns user data with JWT token
 * @param email User email
 * @param password User password
 * @returns User data and JWT token
 * @throws AppError if credentials are invalid
 */
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  // Find user by email
  const user = await query<{
    id: string;
    email: string;
    password: string;
    role: PrismaUserRole;
    mustResetPassword: boolean;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
  );

  if (!user) {
    throw createAuthenticationError("Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw createAuthenticationError("Invalid email or password");
  }

  // Generate JWT token
  const token = generateToken(user.id, convertUserRole(user.role));

  // Return user without password
  const { password: _password, ...userWithoutPassword } = user;

  return {
    user: {
      ...userWithoutPassword,
      role: convertUserRole(user.role),
    },
    token,
  };
}
