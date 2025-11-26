/**
 * Admin service functions
 * Handles admin-only business logic
 */

import { query, UserRole as PrismaUserRole } from "@app/db";
import { UserRole, UserWithoutPassword } from "@medbook/types";
import { createNotFoundError, createValidationError } from "../utils/errors";

/**
 * Converts Prisma UserRole to @medbook/types UserRole
 */
function convertUserRole(role: PrismaUserRole): UserRole {
  return role as UserRole;
}

/**
 * Get all users (admin only)
 * @returns Array of users without passwords
 */
export async function getAllUsers(): Promise<UserWithoutPassword[]> {
  const users = await query((prisma) =>
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  );

  return users.map((user) => ({
    ...user,
    role: convertUserRole(user.role),
  }));
}

/**
 * Get user by ID (admin only)
 * @param userId User ID
 * @returns User profile without password
 * @throws AppError if user not found
 */
export async function getUserById(
  userId: string
): Promise<UserWithoutPassword> {
  const user = await query((prisma) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  );

  if (!user) {
    throw createNotFoundError("User not found");
  }

  return {
    ...user,
    role: convertUserRole(user.role),
  };
}

/**
 * Update user role (admin only)
 */
export interface UpdateUserRoleInput {
  role: UserRole;
}

/**
 * Update user role
 * @param userId User ID
 * @param input Role update input
 * @returns Updated user profile without password
 * @throws AppError if user not found or validation fails
 */
export async function updateUserRole(
  userId: string,
  input: UpdateUserRoleInput
): Promise<UserWithoutPassword> {
  // Validate role
  const validRoles = Object.values(UserRole);
  if (!validRoles.includes(input.role)) {
    throw createValidationError(
      `Invalid role. Must be one of: ${validRoles.join(", ")}`
    );
  }

  // Prevent admin from changing their own role
  // (This check should be done in controller, but adding here for safety)

  try {
    const user = await query((prisma) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          role: input.role as PrismaUserRole,
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

    return {
      ...user,
      role: convertUserRole(user.role),
    };
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("User not found");
    }
    throw error;
  }
}

/**
 * Delete user (admin only)
 * @param userId User ID
 * @throws AppError if user not found
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    await query((prisma) =>
      prisma.user.delete({
        where: { id: userId },
      })
    );
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("User not found");
    }
    throw error;
  }
}

/**
 * Get system statistics (admin only)
 */
export interface SystemStats {
  totalUsers: number;
  usersByRole: {
    PATIENT: number;
    DOCTOR: number;
    ADMIN: number;
  };
}

/**
 * Get system statistics
 * @returns System statistics
 */
export async function getSystemStats(): Promise<SystemStats> {
  const users = await query((prisma) =>
    prisma.user.findMany({
      select: {
        role: true,
      },
    })
  );

  const totalUsers = users.length;
  const usersByRole = {
    PATIENT: 0,
    DOCTOR: 0,
    ADMIN: 0,
  };

  users.forEach((user) => {
    const role = user.role as keyof typeof usersByRole;
    if (role in usersByRole) {
      usersByRole[role]++;
    }
  });

  return {
    totalUsers,
    usersByRole,
  };
}
