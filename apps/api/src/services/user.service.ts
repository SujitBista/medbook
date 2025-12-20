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
  /**
   * Optional URL to the user's profile picture.
   * If explicitly set to null or an empty string, the profile picture will be cleared.
   */
  profilePictureUrl?: string | null;
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
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    profilePictureUrl: string | null;
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
  const { password: _password, profilePictureUrl, ...rest } = user;

  const result: UserWithoutPassword = {
    ...rest,
    role: convertUserRole(user.role),
    ...(profilePictureUrl ? { profilePictureUrl } : {}),
  };

  return result;
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
  // Normalize email if provided (trim and lowercase)
  const normalizedEmail = input.email
    ? input.email.toLowerCase().trim()
    : undefined;

  // Validate email format if provided (after normalization)
  if (normalizedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw createValidationError("Invalid email format");
    }
  }

  // Normalize profile picture URL if provided
  const hasProfilePictureUrlField = Object.prototype.hasOwnProperty.call(
    input,
    "profilePictureUrl"
  );
  const rawProfilePictureUrl = input.profilePictureUrl ?? undefined;
  const normalizedProfilePictureUrl =
    typeof rawProfilePictureUrl === "string"
      ? rawProfilePictureUrl.trim()
      : rawProfilePictureUrl;

  // Check if user exists first (before checking email uniqueness)
  const existingUserForId = await query<{
    id: string;
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
  );

  if (!existingUserForId) {
    throw createNotFoundError("User");
  }

  // Check if email is already taken by another user (only if email is being changed)
  if (normalizedEmail) {
    const existingUserWithEmail = await query<{
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
        where: { email: normalizedEmail },
      })
    );

    if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
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
      emailVerified: boolean;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      profilePictureUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(normalizedEmail && { email: normalizedEmail }),
          ...(hasProfilePictureUrlField && {
            // If explicitly provided, update the profile picture URL.
            // Empty string or null clears the profile picture.
            profilePictureUrl:
              normalizedProfilePictureUrl &&
              normalizedProfilePictureUrl.length > 0
                ? normalizedProfilePictureUrl
                : null,
          }),
        },
      })
    );

    // Exclude password and return user data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, profilePictureUrl, ...rest } = user;

    const result: UserWithoutPassword = {
      ...rest,
      role: convertUserRole(user.role),
      ...(profilePictureUrl ? { profilePictureUrl } : {}),
    };

    return result;
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
    firstName: string;
    lastName: string;
    phoneNumber: string;
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
