/**
 * Integration tests for authentication routes
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, createTestAgent } from "../__tests__/helpers";
import { cleanupTestData, createTestUser } from "../__tests__/db";
import { UserRole } from "@medbook/types";

describe("POST /api/v1/auth/register", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];

  afterEach(async () => {
    // Clean up only users created in this test suite
    if (createdUserIds.length > 0) {
      const { query } = await import("@app/db");
      await query(async (prisma) => {
        await prisma.user.deleteMany({
          where: {
            id: {
              in: createdUserIds,
            },
          },
        });
      });
      createdUserIds.length = 0;
    }
  });

  it("should register a new user successfully", async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "ValidPass123!";
    const firstName = "John";
    const lastName = "Doe";
    const phoneNumber = "555-123-4567";

    const response = await agent
      .post("/api/v1/auth/register")
      .send({ email, password, firstName, lastName, phoneNumber })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email.toLowerCase());
    expect(response.body.user.firstName).toBe(firstName);
    expect(response.body.user.lastName).toBe(lastName);
    expect(response.body.user.phoneNumber).toBe(phoneNumber);
    expect(response.body.user.role).toBe(UserRole.PATIENT);
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe("string");

    // Track created user for cleanup
    createdUserIds.push(response.body.user.id);
  });

  it("should return 400 if email is missing", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({
        password: "ValidPass123!",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
  });

  it("should return 400 if password is missing", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
  });

  it("should return 400 if firstName is missing", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        password: "ValidPass123!",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
    // Details may not be included in test mode (only in development)
    if (response.body.error.details?.errors) {
      expect(response.body.error.details.errors.firstName).toBeDefined();
    }
  });

  it("should return 400 if lastName is missing", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        password: "ValidPass123!",
        firstName: "John",
        phoneNumber: "555-123-4567",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
    // Details may not be included in test mode (only in development)
    if (response.body.error.details?.errors) {
      expect(response.body.error.details.errors.lastName).toBeDefined();
    }
  });

  it("should return 400 if phoneNumber is missing", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        password: "ValidPass123!",
        firstName: "John",
        lastName: "Doe",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
    // Details may not be included in test mode (only in development)
    if (response.body.error.details?.errors) {
      expect(response.body.error.details.errors.phoneNumber).toBeDefined();
    }
  });

  it("should return 400 if email format is invalid", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({
        email: "invalid-email",
        password: "ValidPass123!",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("email");
  });

  it("should return 400 if password does not meet requirements", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        password: "weak",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Password");
  });

  it("should return 409 if user already exists", async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "ValidPass123!";
    const firstName = "John";
    const lastName = "Doe";
    const phoneNumber = "555-123-4567";

    // Create user first
    const existingUser = await createTestUser({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
    });
    createdUserIds.push(existingUser.id);

    // Try to register again
    const response = await agent
      .post("/api/v1/auth/register")
      .send({ email, password, firstName, lastName, phoneNumber })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("already exists");
  });

  it("should normalize email to lowercase", async () => {
    const email = `Test-${Date.now()}@EXAMPLE.COM`;
    const password = "ValidPass123!";
    const firstName = "John";
    const lastName = "Doe";
    const phoneNumber = "555-123-4567";

    const response = await agent
      .post("/api/v1/auth/register")
      .send({ email, password, firstName, lastName, phoneNumber })
      .expect(201);

    expect(response.body.user.email).toBe(email.toLowerCase());
    createdUserIds.push(response.body.user.id);
  });

  it("should trim firstName, lastName, and phoneNumber whitespace", async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "ValidPass123!";
    const firstName = "  John  ";
    const lastName = "  Doe  ";
    const phoneNumber = "  555-123-4567  ";

    const response = await agent
      .post("/api/v1/auth/register")
      .send({ email, password, firstName, lastName, phoneNumber })
      .expect(201);

    expect(response.body.user.firstName).toBe("John");
    expect(response.body.user.lastName).toBe("Doe");
    expect(response.body.user.phoneNumber).toBe("555-123-4567");
    createdUserIds.push(response.body.user.id);
  });
});

describe("POST /api/v1/auth/login", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];

  afterEach(async () => {
    // Clean up only users created in this test suite
    if (createdUserIds.length > 0) {
      const { query } = await import("@app/db");
      await query(async (prisma) => {
        await prisma.user.deleteMany({
          where: {
            id: {
              in: createdUserIds,
            },
          },
        });
      });
      createdUserIds.length = 0;
    }
  });

  it("should login user with valid credentials", async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "ValidPass123!";

    // Create user first
    const testUser = await createTestUser({ email, password });
    createdUserIds.push(testUser.id);

    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBe(testUser.id);
    expect(response.body.user.email).toBe(email.toLowerCase());
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe("string");
  });

  it("should return 400 if email is missing", async () => {
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ password: "ValidPass123!" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
  });

  it("should return 400 if password is missing", async () => {
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
  });

  it("should return 401 if user does not exist", async () => {
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email: "nonexistent@example.com", password: "ValidPass123!" })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Invalid");
  });

  it("should return 401 if password is incorrect", async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "ValidPass123!";

    // Create user first
    const testUser = await createTestUser({ email, password });
    createdUserIds.push(testUser.id);

    // Try to login with wrong password
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email, password: "WrongPass123!" })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Invalid");
  });

  it("should normalize email to lowercase", async () => {
    const emailBase = `test-${Date.now()}@example.com`;
    const emailLower = emailBase.toLowerCase();
    const password = "ValidPass123!";

    // Create user with lowercase email (as the service normalizes it)
    const testUser = await createTestUser({ email: emailLower, password });
    createdUserIds.push(testUser.id);

    // Try to login with uppercase email - should normalize and work
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email: emailBase.toUpperCase(), password })
      .expect(200);

    expect(response.body.user.email).toBe(emailLower);
  });
});
