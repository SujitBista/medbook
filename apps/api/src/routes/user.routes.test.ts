/**
 * Integration tests for user routes
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createTestAgent,
  createAuthHeaders,
} from "../__tests__/helpers";
import { cleanupTestData, createTestUser } from "../__tests__/db";
import { UserRole } from "@medbook/types";

describe("GET /api/v1/users/profile", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    // Clear the tracking array for this test
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    // Clean up only users created in this specific test
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
    }
  });

  it("should get user profile with valid token", async () => {
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .get("/api/v1/users/profile")
      .set(headers)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBe(testUser.id);
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.password).toBeUndefined();
  });

  it("should return 401 if token is missing", async () => {
    const response = await agent.get("/api/v1/users/profile").expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 401 if token is invalid", async () => {
    const response = await agent
      .get("/api/v1/users/profile")
      .set({ Authorization: "Bearer invalid-token" })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 404 if user does not exist", async () => {
    const headers = createAuthHeaders("non-existent-user-id", UserRole.PATIENT);

    const response = await agent
      .get("/api/v1/users/profile")
      .set(headers)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("not found");
  });
});

describe("PUT /api/v1/users/profile", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    // Clear the tracking array for this test
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    // Clean up only users created in this specific test
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
    }
  });

  it("should update user profile with valid data", async () => {
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);
    const newEmail = `updated-${Date.now()}@example.com`;

    const response = await agent
      .put("/api/v1/users/profile")
      .set(headers)
      .send({ email: newEmail })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(newEmail.toLowerCase());
    expect(response.body.user.id).toBe(testUser.id);
  });

  it("should return 400 if email is missing", async () => {
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .put("/api/v1/users/profile")
      .set(headers)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("field");
  });

  it("should return 400 if email format is invalid", async () => {
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .put("/api/v1/users/profile")
      .set(headers)
      .send({ email: "invalid-email" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("email");
  });

  it("should return 400 if email is already taken by another user", async () => {
    const existingUser = await createTestUser();
    createdUserIds.push(existingUser.id);
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    // Try to update testUser's email to existingUser's email (should fail)
    const response = await agent
      .put("/api/v1/users/profile")
      .set(headers)
      .send({ email: existingUser.email })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("already taken");
  });

  it("should allow updating to same email (no change)", async () => {
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    // Update to the same email should succeed (no-op)
    const response = await agent
      .put("/api/v1/users/profile")
      .set(headers)
      .send({ email: testUser.email })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(testUser.email);
  });

  it("should return 401 if token is missing", async () => {
    const response = await agent
      .put("/api/v1/users/profile")
      .send({ email: "test@example.com" })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

describe("PUT /api/v1/users/password", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    // Clear the tracking array for this test
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    // Clean up only users created in this specific test
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
    }
  });

  it("should change password with valid data", async () => {
    const testUser = await createTestUser({ password: "OldPass123!" });
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);
    const newPassword = "NewPass123!";

    const response = await agent
      .put("/api/v1/users/password")
      .set(headers)
      .send({
        currentPassword: "OldPass123!",
        newPassword,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("successfully");

    // Verify new password works
    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: newPassword })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
  });

  it("should return 400 if current password is missing", async () => {
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .put("/api/v1/users/password")
      .set(headers)
      .send({ newPassword: "NewPass123!" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
  });

  it("should return 400 if new password is missing", async () => {
    const testUser = await createTestUser();
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .put("/api/v1/users/password")
      .set(headers)
      .send({ currentPassword: "OldPass123!" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
  });

  it("should return 400 if new password is same as current", async () => {
    const testUser = await createTestUser({ password: "OldPass123!" });
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .put("/api/v1/users/password")
      .set(headers)
      .send({
        currentPassword: "OldPass123!",
        newPassword: "OldPass123!",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("different");
  });

  it("should return 401 if current password is incorrect", async () => {
    const testUser = await createTestUser({ password: "OldPass123!" });
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .put("/api/v1/users/password")
      .set(headers)
      .send({
        currentPassword: "WrongPass123!",
        newPassword: "NewPass123!",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("incorrect");
  });

  it("should return 400 if new password does not meet requirements", async () => {
    const testUser = await createTestUser({ password: "OldPass123!" });
    createdUserIds.push(testUser.id);
    const headers = createAuthHeaders(testUser.id, testUser.role as UserRole);

    const response = await agent
      .put("/api/v1/users/password")
      .set(headers)
      .send({
        currentPassword: "OldPass123!",
        newPassword: "weak",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    // Check for password validation error (could be "Password" or "New password")
    expect(response.body.error.message.toLowerCase()).toMatch(/password/);
  });

  it("should return 401 if token is missing", async () => {
    const response = await agent
      .put("/api/v1/users/password")
      .send({
        currentPassword: "OldPass123!",
        newPassword: "NewPass123!",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});
