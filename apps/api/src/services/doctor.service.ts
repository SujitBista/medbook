/**
 * Doctor service functions
 * Handles doctor management business logic
 */

import { query, Prisma, UserRole as PrismaUserRole } from "@app/db";
import { Doctor, CreateDoctorInput, UpdateDoctorInput } from "@medbook/types";
import {
  createNotFoundError,
  createConflictError,
  createValidationError,
} from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Gets doctor by ID
 * @param doctorId Doctor ID
 * @returns Doctor data
 * @throws AppError if doctor not found
 */
export async function getDoctorById(doctorId: string): Promise<Doctor> {
  const doctor = await query<Prisma.DoctorGetPayload<{
    include: {
      user: {
        select: {
          id: true;
          email: true;
          role: true;
        };
      };
    };
  }> | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor not found");
  }

  return {
    id: doctor.id,
    userId: doctor.userId,
    specialization: doctor.specialization ?? undefined,
    bio: doctor.bio ?? undefined,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}

/**
 * Gets doctor by user ID
 * @param userId User ID
 * @returns Doctor data
 * @throws AppError if doctor not found
 */
export async function getDoctorByUserId(userId: string): Promise<Doctor> {
  const doctor = await query<Prisma.DoctorGetPayload<{
    include: {
      user: {
        select: {
          id: true;
          email: true;
          role: true;
        };
      };
    };
  }> | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor not found");
  }

  return {
    id: doctor.id,
    userId: doctor.userId,
    specialization: doctor.specialization ?? undefined,
    bio: doctor.bio ?? undefined,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}

/**
 * Gets all doctors with optional pagination and search
 * @param options Query options (page, limit, search, hasAvailability)
 * @returns List of doctors and pagination info
 */
export async function getAllDoctors(options?: {
  page?: number;
  limit?: number;
  search?: string;
  specialization?: string;
  hasAvailability?: boolean;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options?.search?.trim().toLowerCase();
  const specialization = options?.specialization?.trim();
  const hasAvailability = options?.hasAvailability ?? false;

  const now = new Date();

  // Build where clause for search
  // Using 'any' for complex Prisma nested types
  const where: Prisma.DoctorWhereInput = {};

  if (specialization) {
    where.specialization = {
      contains: specialization,
      mode: "insensitive",
    };
  }

  if (search) {
    where.OR = [
      {
        user: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  // Filter by availability if requested
  if (hasAvailability) {
    where.availabilities = {
      some: {
        OR: [
          // One-time slots: endTime >= now
          {
            AND: [{ isRecurring: false }, { endTime: { gte: now } }],
          },
          // Recurring slots:
          // - validFrom must be null OR validFrom <= now (already started or no start date)
          // - validTo must be null OR validTo >= now (not expired or no end date)
          {
            AND: [
              { isRecurring: true },
              {
                OR: [{ validFrom: null }, { validFrom: { lte: now } }],
              },
              {
                OR: [{ validTo: null }, { validTo: { gte: now } }],
              },
            ],
          },
        ],
      },
    };
  }

  const [doctors, total] = await Promise.all([
    query<
      Prisma.DoctorGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              email: true;
              role: true;
            };
          };
        };
      }>[]
    >((prisma) =>
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    ),
    query<number>((prisma) => prisma.doctor.count({ where })),
  ]);

  return {
    doctors: doctors.map((doctor) => ({
      id: doctor.id,
      userId: doctor.userId,
      specialization: doctor.specialization ?? undefined,
      bio: doctor.bio ?? undefined,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
      // Include user email for display purposes
      userEmail: doctor.user?.email,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Creates a new doctor profile
 * @param input Doctor creation input
 * @returns Created doctor data
 * @throws AppError if user not found, user is not a doctor, or doctor already exists
 */
export async function createDoctor(input: CreateDoctorInput): Promise<Doctor> {
  const { userId, specialization, bio } = input;

  // Verify user exists and has DOCTOR role
  const user = await query<{
    id: string;
    role: PrismaUserRole;
  } | null>((prisma) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    })
  );

  if (!user) {
    throw createNotFoundError("User not found");
  }

  if (user.role !== "DOCTOR") {
    throw createValidationError(
      "User must have DOCTOR role to create a doctor profile"
    );
  }

  // Check if doctor profile already exists
  const existingDoctor = await query<{
    id: string;
    userId: string;
    specialization: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { userId },
    })
  );

  if (existingDoctor) {
    throw createConflictError("Doctor profile already exists for this user");
  }

  // Create doctor profile
  try {
    const doctor = await query<
      Prisma.DoctorGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              email: true;
              role: true;
            };
          };
        };
      }>
    >((prisma) =>
      prisma.doctor.create({
        data: {
          userId,
          specialization: specialization?.trim() || null,
          bio: bio?.trim() || null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      })
    );

    logger.info("Doctor profile created", { doctorId: doctor.id, userId });

    return {
      id: doctor.id,
      userId: doctor.userId,
      specialization: doctor.specialization ?? undefined,
      bio: doctor.bio ?? undefined,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  } catch (error: unknown) {
    // Handle Prisma unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw createConflictError("Doctor profile already exists for this user");
    }
    throw error;
  }
}

/**
 * Updates doctor profile
 * @param doctorId Doctor ID
 * @param input Update input
 * @returns Updated doctor data
 * @throws AppError if doctor not found
 */
export async function updateDoctor(
  doctorId: string,
  input: UpdateDoctorInput
): Promise<Doctor> {
  const { specialization, bio } = input;

  // Check if doctor exists
  const existingDoctor = await query<{
    id: string;
    userId: string;
    specialization: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
    })
  );

  if (!existingDoctor) {
    throw createNotFoundError("Doctor not found");
  }

  // Update doctor
  try {
    const doctor = await query<
      Prisma.DoctorGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              email: true;
              role: true;
            };
          };
        };
      }>
    >((prisma) =>
      prisma.doctor.update({
        where: { id: doctorId },
        data: {
          ...(specialization !== undefined && {
            specialization: specialization.trim() || null,
          }),
          ...(bio !== undefined && { bio: bio.trim() || null }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      })
    );

    logger.info("Doctor profile updated", { doctorId });

    return {
      id: doctor.id,
      userId: doctor.userId,
      specialization: doctor.specialization ?? undefined,
      bio: doctor.bio ?? undefined,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Doctor not found");
    }
    throw error;
  }
}

/**
 * Deletes a doctor profile and associated user (admin only)
 * @param doctorId Doctor ID
 * @throws AppError if doctor not found
 */
export async function deleteDoctor(doctorId: string): Promise<void> {
  // Check if doctor exists
  const existingDoctor = await query<{
    id: string;
    userId: string;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        userId: true,
      },
    })
  );

  if (!existingDoctor) {
    throw createNotFoundError("Doctor not found");
  }

  try {
    // Delete doctor profile (cascade will handle user deletion if configured)
    // Or delete user which will cascade delete doctor profile
    await query<{
      id: string;
      email: string;
      password: string;
      role: string;
      mustResetPassword: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>((prisma) =>
      prisma.user.delete({
        where: { id: existingDoctor.userId },
      })
    );

    logger.info("Doctor deleted by admin", {
      doctorId,
      userId: existingDoctor.userId,
    });
  } catch (error: unknown) {
    // Handle Prisma not found error (P2025)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw createNotFoundError("Doctor not found");
    }
    throw error;
  }
}

/**
 * Gets doctor statistics
 * @returns Doctor statistics
 */
export interface DoctorStats {
  totalDoctors: number;
  doctorsBySpecialization: Record<string, number>;
}

export async function getDoctorStats(): Promise<DoctorStats> {
  const doctors = await query<
    {
      specialization: string | null;
    }[]
  >((prisma) =>
    prisma.doctor.findMany({
      select: {
        specialization: true,
      },
    })
  );

  const totalDoctors = doctors.length;
  const doctorsBySpecialization: Record<string, number> = {};

  doctors.forEach((doctor) => {
    const specialization = doctor.specialization || "Unspecified";
    doctorsBySpecialization[specialization] =
      (doctorsBySpecialization[specialization] || 0) + 1;
  });

  return {
    totalDoctors,
    doctorsBySpecialization,
  };
}
