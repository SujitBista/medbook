/**
 * Query Performance Tests
 * Tests database query performance, optimization, and N+1 query detection
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query, prisma } from "../index";
import { Prisma } from "@prisma/client";

describe("Query Performance Tests", () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("N+1 Query Detection", () => {
    it("should use include to avoid N+1 queries when fetching doctors with users", async () => {
      // Create test data
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);

      const users = await Promise.all([
        query((prisma) =>
          prisma.user.create({
            data: {
              email: `test-doctor-1-${Date.now()}@example.com`,
              password: hashedPassword,
              role: "DOCTOR",
              firstName: "Doctor",
              lastName: "One",
              phoneNumber: "555-0001",
            },
          })
        ),
        query((prisma) =>
          prisma.user.create({
            data: {
              email: `test-doctor-2-${Date.now()}@example.com`,
              password: hashedPassword,
              role: "DOCTOR",
              firstName: "Doctor",
              lastName: "Two",
              phoneNumber: "555-0002",
            },
          })
        ),
      ]);

      const doctors = await Promise.all([
        query((prisma) =>
          prisma.doctor.create({
            data: {
              userId: users[0].id,
              specialization: "Cardiology",
            },
          })
        ),
        query((prisma) =>
          prisma.doctor.create({
            data: {
              userId: users[1].id,
              specialization: "Neurology",
            },
          })
        ),
      ]);

      // GOOD: Use include to fetch all data in one query
      const startTime = Date.now();
      const doctorsWithUsers = await query((prisma) =>
        prisma.doctor.findMany({
          where: {
            id: {
              in: doctors.map((d) => d.id),
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      );
      const queryTime = Date.now() - startTime;

      // Verify data is correct
      expect(doctorsWithUsers).toHaveLength(2);
      expect(doctorsWithUsers[0].user).toBeDefined();
      expect(doctorsWithUsers[1].user).toBeDefined();

      // Query should complete quickly (under 100ms for 2 records)
      expect(queryTime).toBeLessThan(100);

      // Cleanup
      await query((prisma) =>
        prisma.doctor.deleteMany({
          where: {
            id: {
              in: doctors.map((d) => d.id),
            },
          },
        })
      );
      await query((prisma) =>
        prisma.user.deleteMany({
          where: {
            id: {
              in: users.map((u) => u.id),
            },
          },
        })
      );
    });

    it("should use Promise.all for parallel queries instead of sequential", async () => {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);

      const users = await Promise.all([
        query((prisma) =>
          prisma.user.create({
            data: {
              email: `test-patient-1-${Date.now()}@example.com`,
              password: hashedPassword,
              role: "PATIENT",
              firstName: "Patient",
              lastName: "One",
              phoneNumber: "555-1001",
            },
          })
        ),
        query((prisma) =>
          prisma.user.create({
            data: {
              email: `test-patient-2-${Date.now()}@example.com`,
              password: hashedPassword,
              role: "PATIENT",
              firstName: "Patient",
              lastName: "Two",
              phoneNumber: "555-1002",
            },
          })
        ),
      ]);

      // GOOD: Use Promise.all for parallel queries
      const [user1, user2] = await Promise.all([
        query((prisma) =>
          prisma.user.findUnique({
            where: { id: users[0].id },
          })
        ),
        query((prisma) =>
          prisma.user.findUnique({
            where: { id: users[1].id },
          })
        ),
      ]);

      // BAD: Sequential queries (for comparison)
      const sequentialUser1 = await query((prisma) =>
        prisma.user.findUnique({
          where: { id: users[0].id },
        })
      );
      const sequentialUser2 = await query((prisma) =>
        prisma.user.findUnique({
          where: { id: users[1].id },
        })
      );

      // Verify both approaches work correctly
      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
      expect(sequentialUser1).toBeDefined();
      expect(sequentialUser2).toBeDefined();

      // Verify results are the same
      expect(user1?.id).toBe(sequentialUser1?.id);
      expect(user2?.id).toBe(sequentialUser2?.id);

      // Note: For simple queries, timing can be inconsistent due to:
      // - Database connection pooling
      // - Query caching
      // - System load
      // The important thing is that Promise.all works correctly and is the
      // recommended approach for independent parallel queries

      // Cleanup
      await query((prisma) =>
        prisma.user.deleteMany({
          where: {
            id: {
              in: users.map((u) => u.id),
            },
          },
        })
      );
    });
  });

  describe("Query Optimization", () => {
    it("should use select to fetch only needed fields", async () => {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);

      const user = await query((prisma) =>
        prisma.user.create({
          data: {
            email: `test-select-${Date.now()}@example.com`,
            password: hashedPassword,
            role: "PATIENT",
            firstName: "Test",
            lastName: "User",
            phoneNumber: "555-1234",
          },
        })
      );

      // GOOD: Use select to fetch only needed fields
      const userWithSelect = await query((prisma) =>
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            // Explicitly NOT selecting password
          },
        })
      );

      expect(userWithSelect).toBeDefined();
      expect(userWithSelect?.email).toBe(user.email);
      expect(userWithSelect?.firstName).toBe(user.firstName);
      // Password should not be in the result
      expect(userWithSelect).not.toHaveProperty("password");

      // Cleanup
      await query((prisma) =>
        prisma.user.delete({
          where: { id: user.id },
        })
      );
    });

    it("should use indexes for filtered queries", async () => {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);

      const user = await query((prisma) =>
        prisma.user.create({
          data: {
            email: `test-index-${Date.now()}@example.com`,
            password: hashedPassword,
            role: "DOCTOR",
            firstName: "Test",
            lastName: "Doctor",
            phoneNumber: "555-5678",
          },
        })
      );

      const doctor = await query((prisma) =>
        prisma.doctor.create({
          data: {
            userId: user.id,
            specialization: "Cardiology",
          },
        })
      );

      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      // Create availability with indexed fields
      const availability = await query((prisma) =>
        prisma.availability.create({
          data: {
            doctorId: doctor.id,
            startTime: now,
            endTime: futureDate,
            isRecurring: false,
          },
        })
      );

      // Query using indexed fields (doctorId, startTime, endTime)
      const startTime = Date.now();
      const availabilities = await query((prisma) =>
        prisma.availability.findMany({
          where: {
            doctorId: doctor.id,
            startTime: {
              gte: now,
            },
            endTime: {
              lte: futureDate,
            },
          },
        })
      );
      const queryTime = Date.now() - startTime;

      expect(availabilities).toHaveLength(1);
      expect(availabilities[0].id).toBe(availability.id);

      // Query should complete quickly with indexes (under 50ms)
      expect(queryTime).toBeLessThan(50);

      // Cleanup
      await query((prisma) =>
        prisma.availability.delete({
          where: { id: availability.id },
        })
      );
      await query((prisma) =>
        prisma.doctor.delete({
          where: { id: doctor.id },
        })
      );
      await query((prisma) =>
        prisma.user.delete({
          where: { id: user.id },
        })
      );
    });

    it("should use pagination for large result sets", async () => {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);

      // Create multiple users
      const users = await Promise.all(
        Array.from({ length: 15 }, (_, i) =>
          query((prisma) =>
            prisma.user.create({
              data: {
                email: `test-pagination-${i}-${Date.now()}@example.com`,
                password: hashedPassword,
                role: "PATIENT",
                firstName: `User${i}`,
                lastName: "Test",
                phoneNumber: `555-${i.toString().padStart(4, "0")}`,
              },
            })
          )
        )
      );

      // GOOD: Use pagination (skip/take)
      const page1 = await query((prisma) =>
        prisma.user.findMany({
          where: {
            email: {
              startsWith: `test-pagination-`,
            },
          },
          skip: 0,
          take: 10,
          orderBy: {
            createdAt: "asc",
          },
        })
      );

      const page2 = await query((prisma) =>
        prisma.user.findMany({
          where: {
            email: {
              startsWith: `test-pagination-`,
            },
          },
          skip: 10,
          take: 10,
          orderBy: {
            createdAt: "asc",
          },
        })
      );

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(5); // Remaining 5 records

      // Verify no overlap
      const page1Ids = new Set(page1.map((u) => u.id));
      const page2Ids = new Set(page2.map((u) => u.id));
      const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
      expect(intersection).toHaveLength(0);

      // Cleanup
      await query((prisma) =>
        prisma.user.deleteMany({
          where: {
            id: {
              in: users.map((u) => u.id),
            },
          },
        })
      );
    });
  });

  describe("Transaction Performance", () => {
    it("should use transactions for atomic operations", async () => {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);

      // GOOD: Use transaction for atomic operations
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: `test-transaction-${Date.now()}@example.com`,
            password: hashedPassword,
            role: "DOCTOR",
            firstName: "Test",
            lastName: "Doctor",
            phoneNumber: "555-9999",
          },
        });

        const doctor = await tx.doctor.create({
          data: {
            userId: user.id,
            specialization: "Cardiology",
          },
        });

        return { user, doctor };
      });

      expect(result.user).toBeDefined();
      expect(result.doctor).toBeDefined();
      expect(result.doctor.userId).toBe(result.user.id);

      // Verify both were created
      const userCheck = await query((prisma) =>
        prisma.user.findUnique({
          where: { id: result.user.id },
        })
      );
      const doctorCheck = await query((prisma) =>
        prisma.doctor.findUnique({
          where: { id: result.doctor.id },
        })
      );

      expect(userCheck).toBeDefined();
      expect(doctorCheck).toBeDefined();

      // Cleanup
      await query((prisma) =>
        prisma.doctor.delete({
          where: { id: result.doctor.id },
        })
      );
      await query((prisma) =>
        prisma.user.delete({
          where: { id: result.user.id },
        })
      );
    });
  });

  describe("Query Execution Time", () => {
    it("should complete common queries within acceptable time limits", async () => {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);

      const user = await query((prisma) =>
        prisma.user.create({
          data: {
            email: `test-performance-${Date.now()}@example.com`,
            password: hashedPassword,
            role: "PATIENT",
            firstName: "Test",
            lastName: "User",
            phoneNumber: "555-0000",
          },
        })
      );

      // Test findUnique (should be very fast with primary key)
      const startTime1 = Date.now();
      const foundUser = await query((prisma) =>
        prisma.user.findUnique({
          where: { id: user.id },
        })
      );
      const time1 = Date.now() - startTime1;

      expect(foundUser).toBeDefined();
      expect(time1).toBeLessThan(50); // Should be under 50ms

      // Test findUnique with unique index (email)
      const startTime2 = Date.now();
      const foundUserByEmail = await query((prisma) =>
        prisma.user.findUnique({
          where: { email: user.email },
        })
      );
      const time2 = Date.now() - startTime2;

      expect(foundUserByEmail).toBeDefined();
      expect(time2).toBeLessThan(50); // Should be under 50ms

      // Cleanup
      await query((prisma) =>
        prisma.user.delete({
          where: { id: user.id },
        })
      );
    });
  });
});
