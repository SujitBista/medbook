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
    // Note: Reminders are cascade-deleted when appointments are deleted (onDelete: Cascade),
    // so we don't need to delete them explicitly
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
                patient: {
                  email: {
                    endsWith: "@example.com",
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
              {
                doctor: {
                  user: {
                    email: {
                      endsWith: "@example.com",
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
            OR: [
              {
                doctor: {
                  user: {
                    email: {
                      startsWith: "test-",
                    },
                  },
                },
              },
              {
                doctor: {
                  user: {
                    email: {
                      endsWith: "@example.com",
                    },
                  },
                },
              },
            ],
          },
        });
      } catch (error) {
        console.warn("[cleanupTestData] Failed to delete slots:", error);
      }

      try {
        // Delete slot templates (has foreign key to doctors)
        await prisma.slotTemplate.deleteMany({
          where: {
            OR: [
              {
                doctor: {
                  user: {
                    email: {
                      startsWith: "test-",
                    },
                  },
                },
              },
              {
                doctor: {
                  user: {
                    email: {
                      endsWith: "@example.com",
                    },
                  },
                },
              },
            ],
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
            OR: [
              {
                doctor: {
                  user: {
                    email: {
                      startsWith: "test-",
                    },
                  },
                },
              },
              {
                doctor: {
                  user: {
                    email: {
                      endsWith: "@example.com",
                    },
                  },
                },
              },
            ],
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
            OR: [
              {
                user: {
                  email: {
                    startsWith: "test-",
                  },
                },
              },
              {
                user: {
                  email: {
                    endsWith: "@example.com",
                  },
                },
              },
            ],
          },
        });
      } catch (error) {
        console.warn("[cleanupTestData] Failed to delete doctors:", error);
      }

      try {
        // Delete schedule exceptions (references users, doctors)
        await prisma.scheduleException.deleteMany({
          where: {
            OR: [
              {
                createdBy: {
                  email: { startsWith: "test-" },
                },
              },
              {
                createdBy: {
                  email: { endsWith: "@example.com" },
                },
              },
            ],
          },
        });
      } catch (error) {
        console.warn(
          "[cleanupTestData] Failed to delete schedule exceptions:",
          error
        );
      }

      try {
        // Finally delete users
        // Delete users with emails starting with "test-" OR emails ending with "@example.com"
        // This covers both unique test emails and hardcoded test emails used in tests
        await prisma.user.deleteMany({
          where: {
            OR: [
              {
                email: {
                  startsWith: "test-",
                },
              },
              {
                email: {
                  endsWith: "@example.com",
                },
              },
            ],
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
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  mustResetPassword?: boolean;
}) {
  const { hashPassword } = await import("../utils/auth");

  const emailRaw =
    overrides?.email ||
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  // Normalize email (lowercase and trim) as the service does
  const email = emailRaw.toLowerCase().trim();
  const password = overrides?.password || "Test123!@#";
  const role = overrides?.role || "PATIENT";
  const firstName = overrides?.firstName || "Test";
  const lastName = overrides?.lastName || "User";
  const phoneNumber = overrides?.phoneNumber || "555-123-4567";
  const mustResetPassword = overrides?.mustResetPassword ?? false;

  const hashedPassword = await hashPassword(password);

  try {
    // If a specific email was provided, try to delete any existing user with that email first
    // This helps with test isolation when tests use hardcoded emails
    if (overrides?.email) {
      await query(async (prisma) => {
        await prisma.user.deleteMany({
          where: { email },
        });
      });
    }

    const user = await query(async (prisma) => {
      return prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          firstName,
          lastName,
          phoneNumber,
          mustResetPassword,
        },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
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
  city?: string;
  state?: string;
  yearsOfExperience?: number;
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
          firstName: "Test",
          lastName: "Doctor",
          phoneNumber: "555-123-4567",
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
          city: overrides?.city || null,
          state: overrides?.state || null,
          yearsOfExperience: overrides?.yearsOfExperience || null,
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
          city: overrides?.city || null,
          state: overrides?.state || null,
          yearsOfExperience: overrides?.yearsOfExperience || null,
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
 * Creates a test department in the database.
 * Use for admin doctor creation tests that require departmentId.
 * Slug is always made unique to avoid constraint violations across tests.
 */
export async function createTestDepartment(overrides?: {
  name?: string;
  slug?: string;
}): Promise<{ id: string; name: string; slug: string }> {
  const name =
    overrides?.name ??
    `Test Dept ${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const baseSlug =
    overrides?.slug ??
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  const slug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const department = await query((prisma) =>
    prisma.department.create({
      data: { name, slug },
      select: { id: true, name: true, slug: true },
    })
  );
  return department;
}

/**
 * Creates a test availability in the database
 * Uses a transaction to ensure atomicity and prevent race conditions
 * Note: If doctorId provided, it MUST exist (throws error if not found)
 *       If not provided, creates new doctor within the transaction
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
  const { hashPassword } = await import("../utils/auth");

  // Default to a time slot 1 hour from now, 1 hour long
  const now = new Date();
  const defaultStartTime =
    overrides?.startTime || new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEndTime =
    overrides?.endTime || new Date(defaultStartTime.getTime() + 60 * 60 * 1000);

  // Use a transaction to ensure all data is created atomically
  const result = await withTransaction(async (tx) => {
    // Get or create doctor
    let doctor;
    if (overrides?.doctorId) {
      // If doctorId provided, it MUST exist
      doctor = await tx.doctor.findUnique({
        where: { id: overrides.doctorId },
        select: { id: true, userId: true },
      });
      if (!doctor) {
        throw new Error(
          `Doctor with ID ${overrides.doctorId} not found. Cannot create availability with non-existent doctor.`
        );
      }
    } else {
      // Create a new doctor within the transaction
      const doctorEmail = `test-doctor-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const hashedPassword = await hashPassword("Test123!@#");
      const doctorUser = await tx.user.create({
        data: {
          email: doctorEmail,
          password: hashedPassword,
          role: "DOCTOR",
          firstName: "Test",
          lastName: "Doctor",
          phoneNumber: "555-123-4567",
        },
        select: { id: true },
      });
      doctor = await tx.doctor.create({
        data: {
          userId: doctorUser.id,
          specialization: "General Practice",
          bio: "Test doctor created for availability",
        },
        select: { id: true, userId: true },
      });
    }

    // Create the availability
    const availability = await tx.availability.create({
      data: {
        doctorId: doctor.id,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        dayOfWeek: overrides?.dayOfWeek ?? null,
        isRecurring: overrides?.isRecurring ?? false,
        validFrom: overrides?.validFrom ?? null,
        validTo: overrides?.validTo ?? null,
      },
    });

    return {
      availability,
      doctorId: doctor.id,
      doctorUserId: doctor.userId,
    };
  });

  return {
    id: result.availability.id,
    doctorId: result.doctorId,
    userId: result.doctorUserId,
    startTime: result.availability.startTime,
    endTime: result.availability.endTime,
    dayOfWeek: result.availability.dayOfWeek ?? undefined,
    isRecurring: result.availability.isRecurring,
    validFrom: result.availability.validFrom ?? undefined,
    validTo: result.availability.validTo ?? undefined,
    createdAt: result.availability.createdAt,
    updatedAt: result.availability.updatedAt,
  };
}

/**
 * Creates a test appointment in the database
 * Uses a transaction to ensure atomicity and prevent race conditions
 * Note: If patientId/doctorId provided, they MUST exist (throws error if not found)
 *       If not provided, creates new patient/doctor within the transaction
 */
export async function createTestAppointment(overrides?: {
  patientId?: string;
  doctorId?: string;
  availabilityId?: string;
  startTime?: Date;
  endTime?: Date;
  status?:
    | "PENDING"
    | "CONFIRMED"
    | "BOOKED"
    | "CANCELLED"
    | "COMPLETED"
    | "NO_SHOW";
  notes?: string;
}) {
  const { hashPassword } = await import("../utils/auth");

  // Default to a time slot 1 hour from now, 1 hour long
  const now = new Date();
  const defaultStartTime =
    overrides?.startTime || new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEndTime =
    overrides?.endTime || new Date(defaultStartTime.getTime() + 60 * 60 * 1000);

  // Use a transaction to ensure all data is created atomically
  const result = await withTransaction(async (tx) => {
    // Get or create patient
    let patient;
    if (overrides?.patientId) {
      // If patientId provided, it MUST exist
      patient = await tx.user.findUnique({
        where: { id: overrides.patientId },
        select: { id: true, email: true, role: true },
      });
      if (!patient) {
        throw new Error(
          `Patient with ID ${overrides.patientId} not found. Cannot create appointment with non-existent patient.`
        );
      }
    } else {
      // Create a new patient within the transaction
      const patientEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const hashedPassword = await hashPassword("Test123!@#");
      patient = await tx.user.create({
        data: {
          email: patientEmail,
          password: hashedPassword,
          role: "PATIENT",
          firstName: "Test",
          lastName: "Patient",
          phoneNumber: "555-123-4567",
        },
        select: { id: true, email: true, role: true },
      });
    }

    // Get or create doctor
    let doctor;
    if (overrides?.doctorId) {
      // If doctorId provided, it MUST exist
      doctor = await tx.doctor.findUnique({
        where: { id: overrides.doctorId },
        select: { id: true, userId: true },
      });
      if (!doctor) {
        throw new Error(
          `Doctor with ID ${overrides.doctorId} not found. Cannot create appointment with non-existent doctor.`
        );
      }
    } else {
      // Create a new doctor within the transaction
      const doctorEmail = `test-doctor-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const hashedPassword = await hashPassword("Test123!@#");
      const doctorUser = await tx.user.create({
        data: {
          email: doctorEmail,
          password: hashedPassword,
          role: "DOCTOR",
          firstName: "Test",
          lastName: "Doctor",
          phoneNumber: "555-123-4567",
        },
        select: { id: true },
      });
      doctor = await tx.doctor.create({
        data: {
          userId: doctorUser.id,
          specialization: "General Practice",
          bio: "Test doctor created for appointment",
        },
        select: { id: true, userId: true },
      });
    }

    // Create the appointment
    const appointment = await tx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        availabilityId: overrides?.availabilityId ?? null,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        status: overrides?.status || "PENDING",
        notes: overrides?.notes ?? null,
      },
    });

    return {
      appointment,
      patientId: patient.id,
      doctorId: doctor.id,
    };
  });

  return {
    id: result.appointment.id,
    patientId: result.patientId,
    doctorId: result.doctorId,
    availabilityId: result.appointment.availabilityId ?? undefined,
    startTime: result.appointment.startTime,
    endTime: result.appointment.endTime,
    status: result.appointment.status,
    notes: result.appointment.notes ?? undefined,
    createdAt: result.appointment.createdAt,
    updatedAt: result.appointment.updatedAt,
  };
}
