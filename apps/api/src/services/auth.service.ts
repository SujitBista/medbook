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
  const { email, password, role = UserRole.PATIENT } = input;

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw createValidationError("Password does not meet requirements", {
      errors: passwordValidation.errors,
    });
  }

  // Check if user already exists
  const existingUser = await query((prisma) =>
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
  const user = await query((prisma) =>
    prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role as PrismaUserRole,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  );

  // Generate JWT token
  const token = generateToken(user.id, convertUserRole(user.role));

  return {
    user: {
      ...user,
      role: convertUserRole(user.role),
    },
    token,
  };
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
  const user = await query((prisma) =>
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
