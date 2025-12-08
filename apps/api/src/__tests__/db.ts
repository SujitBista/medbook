/**
 * Database test utilities
 * Helper functions for managing test database state
 */

import { query, withTransaction } from "@app/db";

/**
 * Cleans up test data from the database
 * Should be called after each test or test suite
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in reverse order of dependencies
  // Add more tables as they are created
  await query(async (prisma) => {
    // Delete appointments first (has foreign keys to users, doctors, availabilities)
    await prisma.appointment.deleteMany({
      where: {
        OR: [
          {
            patient: {
              email: {
                startsWith: "test-",
              },
            },
          },
          {
            doctor: {
              user: {
                email: {
                  startsWith: "test-",
                },
              },
            },
          },
        ],
      },
    });
    // Delete availabilities (has foreign key to doctors)
    await prisma.availability.deleteMany({
      where: {
        doctor: {
          user: {
            email: {
              startsWith: "test-",
            },
          },
        },
      },
    });
    // Delete doctors (has foreign key to users)
    await prisma.doctor.deleteMany({
      where: {
        user: {
          email: {
            startsWith: "test-",
          },
        },
      },
    });
    // Then delete users
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: "test-",
        },
      },
    });
  });
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(overrides?: {
  email?: string;
  password?: string;
  role?: "PATIENT" | "DOCTOR" | "ADMIN";
}) {
  const { hashPassword } = await import("../utils/auth");

  const emailRaw =
    overrides?.email ||
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  // Normalize email (lowercase and trim) as the service does
  const email = emailRaw.toLowerCase().trim();
  const password = overrides?.password || "Test123!@#";
  const role = overrides?.role || "PATIENT";

  const hashedPassword = await hashPassword(password);

  const user = await query(async (prisma) => {
    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  return {
    ...user,
    password, // Return plain password for testing
  };
}

/**
 * Creates a test doctor in the database
 * Note: The user must have DOCTOR role
 */
export async function createTestDoctor(overrides?: {
  userId?: string;
  specialization?: string;
  bio?: string;
}) {
  let user;

  if (overrides?.userId) {
    // Use existing user
    user = await query(async (prisma) =>
      prisma.user.findUnique({
        where: { id: overrides.userId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      })
    );

    if (!user) {
      throw new Error(`User with ID ${overrides.userId} not found`);
    }

    if (user.role !== "DOCTOR") {
      throw new Error(`User must have DOCTOR role, got ${user.role}`);
    }
  } else {
    // Create a new doctor user and doctor profile in a single transaction
    // This ensures atomicity and prevents foreign key constraint violations
    const result = await withTransaction(async (tx) => {
      const { hashPassword } = await import("../utils/auth");

      const emailRaw = `test-doctor-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}@example.com`;
      const email = emailRaw.toLowerCase().trim();
      const password = "Test123!@#";
      const hashedPassword = await hashPassword(password);

      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "DOCTOR",
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      // Create doctor profile in the same transaction
      const newDoctor = await tx.doctor.create({
        data: {
          userId: newUser.id,
          specialization: overrides?.specialization || null,
          bio: overrides?.bio || null,
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
      });

      return { user: newUser, doctor: newDoctor };
    });

    return {
      id: result.doctor.id,
      userId: result.doctor.userId,
      specialization: result.doctor.specialization ?? undefined,
      bio: result.doctor.bio ?? undefined,
      createdAt: result.doctor.createdAt,
      updatedAt: result.doctor.updatedAt,
      user: {
        id: result.doctor.user.id,
        email: result.doctor.user.email,
        role: result.doctor.user.role,
      },
    };
  }

  // If using existing user, verify it exists before creating doctor
  const doctor = await query(async (prisma) => {
    // Verify user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      throw new Error(
        `User with ID ${user.id} does not exist in database when creating doctor`
      );
    }

    if (existingUser.role !== "DOCTOR") {
      throw new Error(`User must have DOCTOR role, got ${existingUser.role}`);
    }

    return prisma.doctor.create({
      data: {
        userId: user.id,
        specialization: overrides?.specialization || null,
        bio: overrides?.bio || null,
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
    });
  });

  return {
    id: doctor.id,
    userId: doctor.userId,
    specialization: doctor.specialization ?? undefined,
    bio: doctor.bio ?? undefined,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
    user: {
      id: doctor.user.id,
      email: doctor.user.email,
      role: doctor.user.role,
    },
  };
}

/**
 * Creates a test availability in the database
 * Note: The doctor must exist
 */
export async function createTestAvailability(overrides?: {
  doctorId?: string;
  startTime?: Date;
  endTime?: Date;
  dayOfWeek?: number;
  isRecurring?: boolean;
  validFrom?: Date;
  validTo?: Date;
}) {
  let doctor;

  if (overrides?.doctorId) {
    // Use existing doctor
    doctor = await query(async (prisma) =>
      prisma.doctor.findUnique({
        where: { id: overrides.doctorId },
      })
    );

    if (!doctor) {
      throw new Error(`Doctor with ID ${overrides.doctorId} not found`);
    }
  } else {
    // Create a new doctor
    const testDoctor = await createTestDoctor();
    doctor = await query(async (prisma) =>
      prisma.doctor.findUnique({
        where: { id: testDoctor.id },
      })
    );
  }

  if (!doctor) {
    throw new Error("Failed to get or create doctor");
  }

  // Default to a time slot 1 hour from now, 1 hour long
  const now = new Date();
  const defaultStartTime =
    overrides?.startTime || new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEndTime =
    overrides?.endTime || new Date(defaultStartTime.getTime() + 60 * 60 * 1000);

  const availability = await query(async (prisma) =>
    prisma.availability.create({
      data: {
        doctorId: doctor.id,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        dayOfWeek: overrides?.dayOfWeek ?? null,
        isRecurring: overrides?.isRecurring ?? false,
        validFrom: overrides?.validFrom ?? null,
        validTo: overrides?.validTo ?? null,
      },
    })
  );

  return {
    id: availability.id,
    doctorId: availability.doctorId,
    startTime: availability.startTime,
    endTime: availability.endTime,
    dayOfWeek: availability.dayOfWeek ?? undefined,
    isRecurring: availability.isRecurring,
    validFrom: availability.validFrom ?? undefined,
    validTo: availability.validTo ?? undefined,
    createdAt: availability.createdAt,
    updatedAt: availability.updatedAt,
  };
}

/**
 * Creates a test appointment in the database
 * Note: The patient and doctor must exist
 */
export async function createTestAppointment(overrides?: {
  patientId?: string;
  doctorId?: string;
  availabilityId?: string;
  startTime?: Date;
  endTime?: Date;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes?: string;
}) {
  let patient;
  let doctor;

  if (overrides?.patientId) {
    patient = await query(async (prisma) =>
      prisma.user.findUnique({
        where: { id: overrides.patientId },
      })
    );

    if (!patient) {
      throw new Error(`Patient with ID ${overrides.patientId} not found`);
    }
  } else {
    patient = await createTestUser({ role: "PATIENT" });
  }

  if (overrides?.doctorId) {
    doctor = await query(async (prisma) =>
      prisma.doctor.findUnique({
        where: { id: overrides.doctorId },
      })
    );

    if (!doctor) {
      throw new Error(`Doctor with ID ${overrides.doctorId} not found`);
    }
  } else {
    const testDoctor = await createTestDoctor();
    doctor = await query(async (prisma) =>
      prisma.doctor.findUnique({
        where: { id: testDoctor.id },
      })
    );
  }

  if (!doctor) {
    throw new Error("Failed to get or create doctor");
  }

  // Default to a time slot 1 hour from now, 1 hour long
  const now = new Date();
  const defaultStartTime =
    overrides?.startTime || new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEndTime =
    overrides?.endTime || new Date(defaultStartTime.getTime() + 60 * 60 * 1000);

  const appointment = await query(async (prisma) =>
    prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        availabilityId: overrides?.availabilityId ?? null,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        status: overrides?.status || "PENDING",
        notes: overrides?.notes ?? null,
      },
    })
  );

  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    availabilityId: appointment.availabilityId ?? undefined,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    notes: appointment.notes ?? undefined,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}
