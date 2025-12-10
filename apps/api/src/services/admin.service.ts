/**
 * Admin service functions
 * Handles admin-only business logic
 */

import { query, UserRole as PrismaUserRole, withTransaction } from "@app/db";
import { UserRole, UserWithoutPassword, Doctor } from "@medbook/types";
import { CreateUserInput } from "@medbook/types";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../utils/errors";
import { hashPassword, validatePassword } from "../utils";
import { logger } from "../utils/logger";

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
  const users = await query<
    {
      id: string;
      email: string;
      role: PrismaUserRole;
      mustResetPassword: boolean;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >((prisma) =>
    prisma.user.findMany({
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
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { id: userId },
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

  if (!user) {
    throw createNotFoundError("User");
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
    const user = await query<{
      id: string;
      email: string;
      role: PrismaUserRole;
      mustResetPassword: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          role: input.role as PrismaUserRole,
        },
        select: {
          id: true,
          email: true,
          role: true,
          mustResetPassword: true,
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
      throw createNotFoundError("User");
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
    await query<{
      id: string;
      email: string;
      password: string;
      role: PrismaUserRole;
      mustResetPassword: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
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
      throw createNotFoundError("User");
    }
    throw error;
  }
}

/**
 * Input for creating a doctor user
 */
export interface CreateDoctorUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  specialization?: string;
  bio?: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  yearsOfExperience?: number;
  education?: string;
  profilePictureUrl?: string;
}

/**
 * Result of creating a doctor user
 */
export interface CreateDoctorUserResult {
  user: UserWithoutPassword;
  doctor: Doctor;
}

/**
 * Creates a new doctor user with doctor profile (admin only)
 * Creates both the user account with DOCTOR role and the doctor profile in a single transaction
 * @param input Doctor user creation input
 * @returns Created user and doctor data
 * @throws AppError if validation fails, user already exists, or doctor profile creation fails
 */
export async function createDoctorUser(
  input: CreateDoctorUserInput
): Promise<CreateDoctorUserResult> {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    specialization,
    bio,
    licenseNumber,
    address,
    city,
    state,
    zipCode,
    yearsOfExperience,
    education,
    profilePictureUrl,
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

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError("Invalid email format", {
      errors: {
        email: "Please enter a valid email address",
      },
    });
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    const passwordErrorMessage = passwordValidation.errors.join(". ");
    throw createValidationError("Password does not meet requirements", {
      errors: {
        password: passwordErrorMessage,
      },
      passwordErrors: passwordValidation.errors,
    });
  }

  // Check if user already exists (optimistic check)
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

  // Create user and doctor profile in a transaction
  try {
    const result = await withTransaction(async (tx) => {
      // Create user with DOCTOR role
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: PrismaUserRole.DOCTOR,
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
      });

      // Create doctor profile
      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specialization: specialization?.trim() || null,
          bio: bio?.trim() || null,
          licenseNumber: licenseNumber?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          zipCode: zipCode?.trim() || null,
          yearsOfExperience: yearsOfExperience || null,
          education: education?.trim() || null,
          profilePictureUrl: profilePictureUrl?.trim() || null,
        },
      });

      logger.info("Doctor user created by admin", {
        userId: user.id,
        doctorId: doctor.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      return {
        user: {
          ...user,
          role: convertUserRole(user.role),
        },
        doctor: {
          id: doctor.id,
          userId: doctor.userId,
          specialization: doctor.specialization ?? undefined,
          bio: doctor.bio ?? undefined,
          licenseNumber: doctor.licenseNumber ?? undefined,
          address: doctor.address ?? undefined,
          city: doctor.city ?? undefined,
          state: doctor.state ?? undefined,
          zipCode: doctor.zipCode ?? undefined,
          yearsOfExperience: doctor.yearsOfExperience ?? undefined,
          education: doctor.education ?? undefined,
          profilePictureUrl: doctor.profilePictureUrl ?? undefined,
          createdAt: doctor.createdAt,
          updatedAt: doctor.updatedAt,
        },
      };
    });

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
      if (Array.isArray(target)) {
        if (target.includes("email")) {
          throw createConflictError("User with this email already exists");
        }
        if (target.includes("userId")) {
          throw createConflictError(
            "Doctor profile already exists for this user"
          );
        }
      }
    }
    // Re-throw other errors (they'll be handled by error middleware)
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
  const users = await query<
    {
      role: PrismaUserRole;
    }[]
  >((prisma) =>
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
