/**
 * Database test utilities
 * Helper functions for managing test database state
 */

import { PrismaClient } from "@prisma/client";
import { query } from "@app/db";

/**
 * Cleans up test data from the database
 * Should be called after each test or test suite
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in reverse order of dependencies
  // Add more tables as they are created
  await query(async (prisma) => {
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
