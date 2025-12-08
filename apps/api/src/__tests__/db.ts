/**
 * Database test utilities
 * Helper functions for managing test database state
 */

import { query, withTransaction } from "@app/db";

/**
 * Cleans up test data from the database
 * Should be called after each test or test suite
 * Handles errors gracefully to prevent cleanup failures from breaking tests
 *
 * Deletion order (reverse of dependencies):
 * 1. Appointments (references slots, availabilities, doctors, users)
 * 2. Slots (references doctors, availabilities)
 * 3. SlotTemplates (references doctors)
 * 4. Availabilities (references doctors)
 * 5. Doctors (references users)
 * 6. Users
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Delete in reverse order of dependencies
    await query(async (prisma) => {
      try {
        // Delete appointments first (has foreign keys to slots, users, doctors, availabilities)
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
      } catch (error) {
        // Ignore errors during cleanup - table might not exist or permissions might be insufficient
        // This prevents cleanup failures from breaking tests
        console.warn("[cleanupTestData] Failed to delete appointments:", error);
      }

      try {
        // Delete slots (has foreign keys to doctors, availabilities)
        await prisma.slot.deleteMany({
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
      } catch (error) {
        console.warn("[cleanupTestData] Failed to delete slots:", error);
      }

      try {
        // Delete slot templates (has foreign key to doctors)
        await prisma.slotTemplate.deleteMany({
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
      } catch (error) {
        console.warn(
          "[cleanupTestData] Failed to delete slot templates:",
          error
        );
      }

      try {
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
      } catch (error) {
        console.warn(
          "[cleanupTestData] Failed to delete availabilities:",
          error
        );
      }

      try {
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
      } catch (error) {
        console.warn("[cleanupTestData] Failed to delete doctors:", error);
      }

      try {
        // Finally delete users
        await prisma.user.deleteMany({
          where: {
            email: {
              startsWith: "test-",
            },
          },
        });
      } catch (error) {
        console.warn("[cleanupTestData] Failed to delete users:", error);
      }
    });
  } catch (error) {
    // If database connection fails entirely, log but don't throw
    // This allows tests to continue even if cleanup fails
    console.warn("[cleanupTestData] Database cleanup failed:", error);
  }
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

  try {
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

    // Verify user exists (guard against wrong DB/connection)
    const check = await query(async (prisma) =>
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true },
      })
    );
    if (!check) {
      throw new Error(
        `Failed to verify created user ${user.id} in test database (email=${email})`
      );
    }

    return {
      ...user,
      password, // Return plain password for testing
    };
  } catch (error) {
    // Provide better error messages for common database issues
    if (error && typeof error === "object" && "code" in error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === "P2002") {
        // Unique constraint violation - email already exists
        throw new Error(
          `User with email ${email} already exists. This might indicate test isolation issues.`
        );
      }
      if (dbError.code === "P1001") {
        // Cannot reach database server
        throw new Error(
          `Cannot connect to database. Please ensure PostgreSQL is running and DATABASE_URL is configured correctly. Original error: ${dbError.message}`
        );
      }
    }
    throw error;
  }
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

  // If using existing user, verify it exists and create doctor
  if (overrides?.userId) {
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

  // This should never be reached - transaction already returns above
  throw new Error("Unexpected code path in createTestDoctor");
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
      // Fall back to creating a new doctor if the provided ID is missing
      const testDoctor = await createTestDoctor();
      // Use the returned doctor data directly since transaction guarantees it exists
      doctor = {
        id: testDoctor.id,
        userId: testDoctor.userId,
      } as typeof doctor;
    }
  } else {
    // Create a new doctor - the transaction ensures it exists
    const testDoctor = await createTestDoctor();
    // Use the returned doctor data directly since transaction guarantees it exists
    doctor = {
      id: testDoctor.id,
      userId: testDoctor.userId,
    } as typeof doctor;
  }

  if (!doctor || !doctor.id) {
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

  // Verify availability exists
  const verified = await query(async (prisma) =>
    prisma.availability.findUnique({
      where: { id: availability.id },
      select: { id: true, doctorId: true },
    })
  );
  if (!verified) {
    throw new Error(
      `Failed to verify created availability ${availability.id} in test database`
    );
  }

  return {
    id: verified.id,
    doctorId: verified.doctorId,
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
      // Fall back to creating a new patient if the provided ID is missing
      patient = await createTestUser({ role: "PATIENT" });
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
      // Fall back to creating a new doctor if the provided ID is missing
      const fallbackDoctor = await createTestDoctor();
      // Use the returned doctor data directly since transaction guarantees it exists
      doctor = {
        id: fallbackDoctor.id,
        userId: fallbackDoctor.userId,
      } as typeof doctor;
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

  // Verify appointment exists
  const verified = await query(async (prisma) =>
    prisma.appointment.findUnique({
      where: { id: appointment.id },
      select: { id: true, patientId: true, doctorId: true },
    })
  );
  if (!verified) {
    throw new Error(
      `Failed to verify created appointment ${appointment.id} in test database`
    );
  }

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
