/**
 * Admin service functions
 * Handles admin-only business logic
 */

import {
  query,
  UserRole as PrismaUserRole,
  withTransaction,
  checkDatabaseHealth,
} from "@app/db";
import { UserRole, UserWithoutPassword, Doctor } from "@medbook/types";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../utils/errors";
import { hashPassword, validatePassword } from "../utils";
import { logger } from "../utils/logger";
import { env, isDevelopment } from "../config/env";

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
      firstName: string;
      lastName: string;
      phoneNumber: string;
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
          firstName: true,
          lastName: true,
          phoneNumber: true,
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
  growthTrends?: {
    totalUsersChange: number; // Percentage change from previous month
    usersByRoleChange: {
      PATIENT: number;
      DOCTOR: number;
      ADMIN: number;
    };
  };
}

/**
 * Get system statistics
 * @returns System statistics
 */
export async function getSystemStats(): Promise<SystemStats> {
  const now = new Date();

  // Current month boundaries
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfCurrentMonth.setHours(0, 0, 0, 0);

  // Previous month boundaries
  const startOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );
  startOfPreviousMonth.setHours(0, 0, 0, 0);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  endOfPreviousMonth.setHours(23, 59, 59, 999);

  // Get all users
  const users = await query<
    {
      role: PrismaUserRole;
      createdAt: Date;
    }[]
  >((prisma) =>
    prisma.user.findMany({
      select: {
        role: true,
        createdAt: true,
      },
    })
  );

  const totalUsers = users.length;
  const usersByRole = {
    PATIENT: 0,
    DOCTOR: 0,
    ADMIN: 0,
  };

  // Count users by role (current)
  users.forEach((user) => {
    const role = user.role as keyof typeof usersByRole;
    if (role in usersByRole) {
      usersByRole[role]++;
    }
  });

  // Calculate growth trends (compare new users this month vs previous month)
  const usersCreatedThisMonth = users.filter(
    (user) => user.createdAt >= startOfCurrentMonth
  ).length;

  const usersCreatedPreviousMonth = users.filter(
    (user) =>
      user.createdAt >= startOfPreviousMonth &&
      user.createdAt < startOfCurrentMonth
  ).length;

  // Calculate percentage change in new user signups
  const totalUsersChange =
    usersCreatedPreviousMonth > 0
      ? ((usersCreatedThisMonth - usersCreatedPreviousMonth) /
          usersCreatedPreviousMonth) *
        100
      : usersCreatedThisMonth > 0
        ? 100 // 100% growth if there were no users last month but there are this month
        : 0;

  // Calculate role-based growth (new users by role this month vs previous month)
  const previousMonthNewByRole = {
    PATIENT: 0,
    DOCTOR: 0,
    ADMIN: 0,
  };
  const currentMonthNewByRole = {
    PATIENT: 0,
    DOCTOR: 0,
    ADMIN: 0,
  };

  users.forEach((user) => {
    const role = user.role as keyof typeof usersByRole;
    if (
      user.createdAt >= startOfPreviousMonth &&
      user.createdAt < startOfCurrentMonth
    ) {
      previousMonthNewByRole[role]++;
    } else if (user.createdAt >= startOfCurrentMonth) {
      currentMonthNewByRole[role]++;
    }
  });

  const usersByRoleChange = {
    PATIENT:
      previousMonthNewByRole.PATIENT > 0
        ? ((currentMonthNewByRole.PATIENT - previousMonthNewByRole.PATIENT) /
            previousMonthNewByRole.PATIENT) *
          100
        : currentMonthNewByRole.PATIENT > 0
          ? 100
          : 0,
    DOCTOR:
      previousMonthNewByRole.DOCTOR > 0
        ? ((currentMonthNewByRole.DOCTOR - previousMonthNewByRole.DOCTOR) /
            previousMonthNewByRole.DOCTOR) *
          100
        : currentMonthNewByRole.DOCTOR > 0
          ? 100
          : 0,
    ADMIN:
      previousMonthNewByRole.ADMIN > 0
        ? ((currentMonthNewByRole.ADMIN - previousMonthNewByRole.ADMIN) /
            previousMonthNewByRole.ADMIN) *
          100
        : currentMonthNewByRole.ADMIN > 0
          ? 100
          : 0,
  };

  return {
    totalUsers,
    usersByRole,
    growthTrends: {
      totalUsersChange: Math.round(totalUsersChange * 100) / 100,
      usersByRoleChange: {
        PATIENT: Math.round(usersByRoleChange.PATIENT * 100) / 100,
        DOCTOR: Math.round(usersByRoleChange.DOCTOR * 100) / 100,
        ADMIN: Math.round(usersByRoleChange.ADMIN * 100) / 100,
      },
    },
  };
}

/**
 * Appointment statistics (admin only)
 */
export interface AppointmentStats {
  total: number;
  byStatus: {
    PENDING: number;
    CONFIRMED: number;
    CANCELLED: number;
    COMPLETED: number;
  };
  upcoming: number; // Appointments with startTime > now
  today: number; // Appointments scheduled for today
  thisWeek: number; // Appointments scheduled this week
  thisMonth: number; // Appointments scheduled this month
  recentActivity: {
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  };
  growthTrends?: {
    thisMonthChange: number; // Percentage change in appointments created this month vs previous month
    thisWeekChange: number; // Percentage change in appointments created this week vs previous week
  };
}

/**
 * Get appointment statistics
 * @returns Appointment statistics
 */
export async function getAppointmentStats(): Promise<AppointmentStats> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // Start of this week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // End of this week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Start of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  // End of this month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Previous month boundaries (for growth comparison)
  const startOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );
  startOfPreviousMonth.setHours(0, 0, 0, 0);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  endOfPreviousMonth.setHours(23, 59, 59, 999);

  // Previous week boundaries (for growth comparison)
  const startOfPreviousWeek = new Date(startOfWeek);
  startOfPreviousWeek.setDate(startOfWeek.getDate() - 7);
  const endOfPreviousWeek = new Date(startOfWeek);
  endOfPreviousWeek.setDate(startOfWeek.getDate() - 1);
  endOfPreviousWeek.setHours(23, 59, 59, 999);

  // Get all appointments
  const appointments = await query<
    {
      status: string;
      startTime: Date;
      createdAt: Date;
    }[]
  >((prisma) =>
    prisma.appointment.findMany({
      select: {
        status: true,
        startTime: true,
        createdAt: true,
      },
    })
  );

  // Calculate statistics
  const total = appointments.length;
  const byStatus = {
    PENDING: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
    COMPLETED: 0,
  };

  let upcoming = 0;
  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  const recentActivity = {
    createdToday: 0,
    createdThisWeek: 0,
    createdThisMonth: 0,
  };

  let previousMonthCreated = 0;
  let previousWeekCreated = 0;

  appointments.forEach((apt) => {
    // Count by status
    const status = apt.status as keyof typeof byStatus;
    if (status in byStatus) {
      byStatus[status]++;
    }

    // Count upcoming (startTime > now)
    if (apt.startTime > now) {
      upcoming++;
    }

    // Count today
    if (apt.startTime >= startOfToday && apt.startTime <= endOfToday) {
      today++;
    }

    // Count this week
    if (apt.startTime >= startOfWeek && apt.startTime <= endOfWeek) {
      thisWeek++;
    }

    // Count this month
    if (apt.startTime >= startOfMonth && apt.startTime <= endOfMonth) {
      thisMonth++;
    }

    // Count recent activity (by createdAt)
    if (apt.createdAt >= startOfToday && apt.createdAt <= endOfToday) {
      recentActivity.createdToday++;
    }
    if (apt.createdAt >= startOfWeek && apt.createdAt <= endOfWeek) {
      recentActivity.createdThisWeek++;
    }
    if (apt.createdAt >= startOfMonth && apt.createdAt <= endOfMonth) {
      recentActivity.createdThisMonth++;
    }

    // Count previous period for growth comparison
    if (
      apt.createdAt >= startOfPreviousMonth &&
      apt.createdAt <= endOfPreviousMonth
    ) {
      previousMonthCreated++;
    }
    if (
      apt.createdAt >= startOfPreviousWeek &&
      apt.createdAt <= endOfPreviousWeek
    ) {
      previousWeekCreated++;
    }
  });

  // Calculate growth trends
  const thisMonthChange =
    previousMonthCreated > 0
      ? ((recentActivity.createdThisMonth - previousMonthCreated) /
          previousMonthCreated) *
        100
      : recentActivity.createdThisMonth > 0
        ? 100
        : 0;

  const thisWeekChange =
    previousWeekCreated > 0
      ? ((recentActivity.createdThisWeek - previousWeekCreated) /
          previousWeekCreated) *
        100
      : recentActivity.createdThisWeek > 0
        ? 100
        : 0;

  return {
    total,
    byStatus,
    upcoming,
    today,
    thisWeek,
    thisMonth,
    recentActivity,
    growthTrends: {
      thisMonthChange: Math.round(thisMonthChange * 100) / 100,
      thisWeekChange: Math.round(thisWeekChange * 100) / 100,
    },
  };
}

/**
 * System health status (admin only)
 */
export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  database: {
    status: "connected" | "disconnected";
    healthy: boolean;
  };
  email: {
    status: "configured" | "not_configured" | "unknown";
    healthy: boolean;
  };
  environment: string;
  timestamp: string;
}

/**
 * Get system health status
 * @returns System health information
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const timestamp = new Date().toISOString();

  // Check database health
  const dbHealthy = await checkDatabaseHealth();

  // Check email service configuration
  const emailConfigured = !!env.resendApiKey;
  // In development, email service is considered healthy even without API key (it logs emails)
  const emailHealthy = isDevelopment || emailConfigured;

  // Determine overall system status
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (!dbHealthy) {
    overallStatus = "unhealthy";
  } else if (!emailHealthy) {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    database: {
      status: dbHealthy ? "connected" : "disconnected",
      healthy: dbHealthy,
    },
    email: {
      status: emailConfigured
        ? "configured"
        : isDevelopment
          ? "not_configured"
          : "unknown",
      healthy: emailHealthy,
    },
    environment: env.nodeEnv,
    timestamp,
  };
}
