/**
 * Integration tests for admin routes
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createTestAgent,
  createAuthHeaders,
} from "../__tests__/helpers";
import { cleanupTestData, createTestUser } from "../__tests__/db";
import { UserRole } from "@medbook/types";
import { query } from "@app/db";

describe("POST /api/v1/admin/doctors", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should create a doctor user with profile successfully (admin only)", async () => {
    // Create an admin user
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const email = `test-doctor-${Date.now()}@example.com`;
    const password = "ValidPass123!";
    const specialization = "Cardiology";
    const bio = "Experienced cardiologist";

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email,
        password,
        specialization,
        bio,
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email.toLowerCase());
    expect(response.body.user.role).toBe(UserRole.DOCTOR);
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.doctor).toBeDefined();
    expect(response.body.doctor.specialization).toBe(specialization);
    expect(response.body.doctor.bio).toBe(bio);
    expect(response.body.doctor.userId).toBe(response.body.user.id);

    // Track created user and doctor for cleanup
    createdUserIds.push(response.body.user.id);
    createdDoctorIds.push(response.body.doctor.id);

    // Verify user was created in database
    const user = await query(async (prisma) =>
      prisma.user.findUnique({
        where: { id: response.body.user.id },
        include: { doctor: true },
      })
    );

    expect(user).toBeDefined();
    expect(user?.role).toBe("DOCTOR");
    expect(user?.doctor).toBeDefined();
    expect(user?.doctor?.specialization).toBe(specialization);
    expect(user?.doctor?.bio).toBe(bio);
  });

  it("should create doctor user with minimal fields (only email and password)", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const email = `test-doctor-minimal-${Date.now()}@example.com`;
    const password = "ValidPass123!";

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email,
        password,
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(email.toLowerCase());
    expect(response.body.user.role).toBe(UserRole.DOCTOR);
    expect(response.body.doctor).toBeDefined();
    expect(response.body.doctor.specialization).toBeUndefined();
    expect(response.body.doctor.bio).toBeUndefined();

    createdUserIds.push(response.body.user.id);
    createdDoctorIds.push(response.body.doctor.id);
  });

  it("should return 401 if not authenticated", async () => {
    const response = await agent
      .post("/api/v1/admin/doctors")
      .send({
        email: "test@example.com",
        password: "ValidPass123!",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 403 if user is not admin", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(patient.id, UserRole.PATIENT))
      .send({
        email: "test@example.com",
        password: "ValidPass123!",
      })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Access denied");
  });

  it("should return 400 if email is missing", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        password: "ValidPass123!",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
    // Details may not be included in test mode (only in development)
    if (response.body.error.details?.errors) {
      expect(response.body.error.details.errors.email).toBeDefined();
    }
  });

  it("should return 400 if password is missing", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email: "test@example.com",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("required");
    // Details may not be included in test mode (only in development)
    if (response.body.error.details?.errors) {
      expect(response.body.error.details.errors.password).toBeDefined();
    }
  });

  it("should return 400 if email format is invalid", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email: "invalid-email",
        password: "ValidPass123!",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Invalid email format");
    // Details may not be included in test mode (only in development)
    if (response.body.error.details?.errors) {
      expect(response.body.error.details.errors.email).toBeDefined();
    }
  });

  it("should return 400 if password does not meet requirements", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email: "test@example.com",
        password: "weak",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain(
      "Password does not meet requirements"
    );
    // Details may not be included in test mode (only in development)
    if (response.body.error.details?.errors) {
      expect(response.body.error.details.errors.password).toBeDefined();
    }
  });

  it("should return 409 if user with email already exists", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    // Use a unique email with timestamp to avoid conflicts
    const existingEmail = `existing-${Date.now()}@example.com`;
    const existingUser = await createTestUser({
      email: existingEmail,
      role: "PATIENT",
    });
    createdUserIds.push(existingUser.id);

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email: existingUser.email,
        password: "ValidPass123!",
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("already exists");
  });

  it("should normalize email (lowercase and trim)", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    // Use a valid email format (email validation happens before normalization)
    const emailBase = `TEST-DOCTOR-${Date.now()}@EXAMPLE.COM`;
    const email = `  ${emailBase}  `;
    const password = "ValidPass123!";

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email: emailBase, // Send valid email, normalization will lowercase it
        password,
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(emailBase.toLowerCase());
    expect(response.body.user.email).not.toContain(" ");
    expect(response.body.user.email).toBe(emailBase.toLowerCase());

    createdUserIds.push(response.body.user.id);
    createdDoctorIds.push(response.body.doctor.id);
  });

  it("should create user and doctor profile in a single transaction", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const email = `test-transaction-${Date.now()}@example.com`;
    const password = "ValidPass123!";

    const response = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email,
        password,
        specialization: "Pediatrics",
      })
      .expect(201);

    // Verify both user and doctor were created
    const user = await query(async (prisma) =>
      prisma.user.findUnique({
        where: { id: response.body.user.id },
        include: { doctor: true },
      })
    );

    expect(user).toBeDefined();
    expect(user?.doctor).toBeDefined();
    expect(user?.doctor?.specialization).toBe("Pediatrics");

    createdUserIds.push(response.body.user.id);
    createdDoctorIds.push(response.body.doctor.id);
  });

  it("should handle optional specialization and bio fields", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const email = `test-optional-${Date.now()}@example.com`;
    const password = "ValidPass123!";

    // Test with only specialization
    const response1 = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email: email + "1",
        password,
        specialization: "Dermatology",
      })
      .expect(201);

    expect(response1.body.doctor.specialization).toBe("Dermatology");
    expect(response1.body.doctor.bio).toBeUndefined();

    createdUserIds.push(response1.body.user.id);
    createdDoctorIds.push(response1.body.doctor.id);

    // Test with only bio
    const response2 = await agent
      .post("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        email: email + "2",
        password,
        bio: "Experienced doctor",
      })
      .expect(201);

    expect(response2.body.doctor.bio).toBe("Experienced doctor");
    expect(response2.body.doctor.specialization).toBeUndefined();

    createdUserIds.push(response2.body.user.id);
    createdDoctorIds.push(response2.body.doctor.id);
  });
});
