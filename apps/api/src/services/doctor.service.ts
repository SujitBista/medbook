/**
 * Doctor service functions
 * Handles doctor management business logic
 */

import { query } from "@app/db";
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
  const doctor = await query((prisma) =>
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
  const doctor = await query((prisma) =>
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
 * @param options Query options (page, limit, search)
 * @returns List of doctors and pagination info
 */
export async function getAllDoctors(options?: {
  page?: number;
  limit?: number;
  search?: string;
  specialization?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options?.search?.trim().toLowerCase();
  const specialization = options?.specialization?.trim();

  // Build where clause for search
  const where: {
    specialization?: { contains: string; mode: "insensitive" };
    OR?: Array<{
      user?: { email?: { contains: string; mode: "insensitive" } };
    }>;
  } = {};

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

  const [doctors, total] = await Promise.all([
    query((prisma) =>
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
    query((prisma) => prisma.doctor.count({ where })),
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
  const user = await query((prisma) =>
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
  const existingDoctor = await query((prisma) =>
    prisma.doctor.findUnique({
      where: { userId },
    })
  );

  if (existingDoctor) {
    throw createConflictError("Doctor profile already exists for this user");
  }

  // Create doctor profile
  try {
    const doctor = await query((prisma) =>
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
  const existingDoctor = await query((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
    })
  );

  if (!existingDoctor) {
    throw createNotFoundError("Doctor not found");
  }

  // Update doctor
  try {
    const doctor = await query((prisma) =>
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
