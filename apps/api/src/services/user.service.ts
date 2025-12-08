/**
 * User service functions
 * Handles user profile management business logic
 */

import { query, UserRole as PrismaUserRole } from "@app/db";
import { UserRole, UserWithoutPassword } from "@medbook/types";
import { hashPassword, comparePassword, validatePassword } from "../utils";
import {
  createNotFoundError,
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
 * Update user profile input
 */
export interface UpdateUserProfileInput {
  email?: string;
}

/**
 * Change password input
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Gets user profile by ID
 * @param userId User ID
 * @returns User profile without password
 * @throws AppError if user not found
 */
export async function getUserProfile(
  userId: string
): Promise<UserWithoutPassword> {
  const user = await query<{
    id: string;
    email: string;
    password: string;
    role: PrismaUserRole;
    mustResetPassword: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { id: userId },
    })
  );

  if (!user) {
    throw createNotFoundError("User");
  }

  // Exclude password and return user data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    role: convertUserRole(user.role),
  } as UserWithoutPassword;
}

/**
 * Updates user profile
 * @param userId User ID
 * @param input Profile update input
 * @returns Updated user profile without password
 * @throws AppError if user not found or validation fails
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<UserWithoutPassword> {
  // Validate email format if provided
  if (input.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw createValidationError("Invalid email format");
    }
  }

  // Check if email is already taken by another user
  if (input.email) {
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
        where: { email: input.email!.toLowerCase().trim() },
      })
    );

    if (existingUser && existingUser.id !== userId) {
      throw createValidationError("Email is already taken");
    }
  }

  // Update user
  try {
    const user = await query<{
      id: string;
      email: string;
      password: string;
      role: PrismaUserRole;
      mustResetPassword: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.email && { email: input.email.toLowerCase().trim() }),
        },
      })
    );

    // Exclude password and return user data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      role: convertUserRole(user.role),
    } as UserWithoutPassword;
  } catch (error: unknown) {
    // Handle Prisma unique constraint violation (race condition)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const prismaError = error as {
        code: string;
        meta?: { target?: unknown };
      };
      const target = prismaError.meta?.target;
      if (Array.isArray(target) && target.includes("email")) {
        throw createValidationError("Email is already taken");
      }
    }
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("User");
    }
    throw error;
  }
}

/**
 * Changes user password
 * @param userId User ID
 * @param input Password change input
 * @throws AppError if user not found, current password invalid, or new password invalid
 */
export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput
): Promise<void> {
  const { currentPassword, newPassword } = input;

  // Get user with password
  const user = await query<{
    id: string;
    email: string;
    password: string;
    role: PrismaUserRole;
    mustResetPassword: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { id: userId },
    })
  );

  if (!user) {
    throw createNotFoundError("User");
  }

  // Verify current password
  const isCurrentPasswordValid = await comparePassword(
    currentPassword,
    user.password
  );
  if (!isCurrentPasswordValid) {
    throw createAuthenticationError("Current password is incorrect");
  }

  // Validate new password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw createValidationError("New password does not meet requirements", {
      errors: passwordValidation.errors,
    });
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear mustResetPassword flag
  try {
    await query(async (prisma) => {
      // Update password first
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      // Then update mustResetPassword flag
      // Using $executeRaw to work around TypeScript type issues
      await prisma.$executeRaw`
        UPDATE users SET "mustResetPassword" = false WHERE id = ${userId}
      `;
    });
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025) - user might have been deleted
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("User");
    }
    throw error;
  }
}
