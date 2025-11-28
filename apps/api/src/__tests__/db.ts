/**
 * Database test utilities
 * Helper functions for managing test database state
 */

import { query } from "@app/db";

/**
 * Cleans up test data from the database
 * Should be called after each test or test suite
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in reverse order of dependencies
  // Add more tables as they are created
  await query(async (prisma) => {
    // Delete doctors first (has foreign key to users)
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
    // Create a new doctor user
    user = await createTestUser({ role: "DOCTOR" });
  }

  const doctor = await query(async (prisma) =>
    prisma.doctor.create({
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
    })
  );

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
