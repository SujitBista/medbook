/**
 * Seed Script Tests
 * Tests the database seed script functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { query, prisma } from "../index";
import { execSync } from "child_process";
import { resolve } from "path";
import bcrypt from "bcrypt";

describe("Seed Script Tests", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // Note: We don't delete all users, just test users to avoid affecting other tests
    await query((prisma) =>
      prisma.user.deleteMany({
        where: {
          email: {
            in: [
              "admin@medbook.com",
              "admin2@medbook.com",
              "doctor@medbook.com",
              "doctor.smith@medbook.com",
              "doctor.jones@medbook.com",
              "patient@medbook.com",
              "patient.john@medbook.com",
              "patient.jane@medbook.com",
              "patient.bob@medbook.com",
            ],
          },
        },
      })
    );
  });

  describe("Seed Script Execution", () => {
    it("should run seed script successfully", async () => {
      const seedPath = resolve(__dirname, "../../prisma/seed.ts");
      const dbPackagePath = resolve(__dirname, "../..");

      // Run seed script
      const result = execSync(
        `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" npx tsx prisma/seed.ts`,
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DATABASE_URL:
              process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
          },
        }
      );

      expect(result).toBeDefined();
      // Seed script should output success message
      expect(result).toContain("Database seed completed successfully");
    });

    it("should create expected users with correct roles", async () => {
      // Run seed
      const dbPackagePath = resolve(__dirname, "../..");
      execSync(
        `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" npx tsx prisma/seed.ts`,
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DATABASE_URL:
              process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
          },
        }
      );

      // Verify admin users
      const admin1 = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "admin@medbook.com" },
        })
      );
      const admin2 = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "admin2@medbook.com" },
        })
      );

      expect(admin1).toBeDefined();
      expect(admin1?.role).toBe("ADMIN");
      expect(admin1?.mustResetPassword).toBe(true);
      expect(admin2).toBeDefined();
      expect(admin2?.role).toBe("ADMIN");
      expect(admin2?.mustResetPassword).toBe(true);

      // Verify doctor users
      const doctor1 = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "doctor@medbook.com" },
        })
      );
      const doctor2 = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "doctor.smith@medbook.com" },
        })
      );

      expect(doctor1).toBeDefined();
      expect(doctor1?.role).toBe("DOCTOR");
      expect(doctor2).toBeDefined();
      expect(doctor2?.role).toBe("DOCTOR");

      // Verify patient users
      const patient1 = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "patient@medbook.com" },
        })
      );
      const patient2 = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "patient.john@medbook.com" },
        })
      );

      expect(patient1).toBeDefined();
      expect(patient1?.role).toBe("PATIENT");
      expect(patient2).toBeDefined();
      expect(patient2?.role).toBe("PATIENT");
    });

    it("should hash passwords correctly", async () => {
      // Run seed
      const dbPackagePath = resolve(__dirname, "../..");
      execSync(
        `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" npx tsx prisma/seed.ts`,
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DATABASE_URL:
              process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
          },
        }
      );

      // Get a seeded user
      const user = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "patient@medbook.com" },
        })
      );

      expect(user).toBeDefined();
      expect(user?.password).toBeDefined();
      // Password should be hashed (not plain text)
      expect(user?.password).not.toBe("password123");
      // Password should be a bcrypt hash (starts with $2a$, $2b$, or $2y$)
      expect(user?.password).toMatch(/^\$2[aby]\$/);

      // Verify password can be verified with bcrypt
      const isValid = await bcrypt.compare("password123", user!.password);
      expect(isValid).toBe(true);
    });

    it("should handle existing users correctly (upsert behavior)", async () => {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("OldPassword123", 10);

      // Create a user that will be seeded
      const existingUser = await query((prisma) =>
        prisma.user.create({
          data: {
            email: "doctor@medbook.com",
            password: hashedPassword,
            role: "DOCTOR",
            firstName: "Existing",
            lastName: "Doctor",
            phoneNumber: "555-0000",
          },
        })
      );

      // Store the original ID for reference
      const originalId = existingUser.id;

      // Run seed (seed script deletes all users first, then creates new ones)
      const dbPackagePath = resolve(__dirname, "../..");
      execSync(
        `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" npx tsx prisma/seed.ts`,
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DATABASE_URL:
              process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
          },
        }
      );

      // Verify user exists (seed script deletes all users, then creates new ones)
      // So the user will have a new ID, but same email
      const users = await query((prisma) =>
        prisma.user.findMany({
          where: { email: "doctor@medbook.com" },
        })
      );

      expect(users).toHaveLength(1);
      // Note: Seed script deletes all users first, so ID will be different
      // But the email should match and user should exist
      expect(users[0].email).toBe("doctor@medbook.com");
      expect(users[0].role).toBe("DOCTOR");
      // Password should be updated to default seed password
      const isValid = await bcrypt.compare("password123", users[0].password);
      expect(isValid).toBe(true);
      // Verify firstName, lastName, phoneNumber are set correctly
      expect(users[0].firstName).toBe("Doctor");
      expect(users[0].lastName).toBe("Smith");
      expect(users[0].phoneNumber).toBe("555-1001");
    });

    it("should create all expected user counts", async () => {
      // Run seed
      const dbPackagePath = resolve(__dirname, "../..");
      execSync(
        `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" npx tsx prisma/seed.ts`,
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DATABASE_URL:
              process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
          },
        }
      );

      // Count users by role
      const userCounts = await query((prisma) =>
        prisma.user.groupBy({
          by: ["role"],
          where: {
            email: {
              in: [
                "admin@medbook.com",
                "admin2@medbook.com",
                "doctor@medbook.com",
                "doctor.smith@medbook.com",
                "doctor.jones@medbook.com",
                "patient@medbook.com",
                "patient.john@medbook.com",
                "patient.jane@medbook.com",
                "patient.bob@medbook.com",
              ],
            },
          },
          _count: true,
        })
      );

      const countsByRole = userCounts.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(countsByRole.ADMIN).toBe(2);
      expect(countsByRole.DOCTOR).toBe(3);
      expect(countsByRole.PATIENT).toBe(4);
    });

    it("should use custom password from SEED_PASSWORD environment variable", async () => {
      const customPassword = "CustomSeedPassword123!";

      // Run seed with custom password
      const dbPackagePath = resolve(__dirname, "../..");
      execSync(
        `cd "${dbPackagePath}" && DATABASE_URL="${process.env.DATABASE_URL}" SEED_PASSWORD="${customPassword}" npx tsx prisma/seed.ts`,
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            DATABASE_URL:
              process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
            SEED_PASSWORD: customPassword,
          },
        }
      );

      // Verify password
      const user = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: "patient@medbook.com" },
        })
      );

      expect(user).toBeDefined();
      const isValid = await bcrypt.compare(customPassword, user!.password);
      expect(isValid).toBe(true);
    });
  });
});
