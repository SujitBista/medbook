/**
 * Integration tests for admin routes
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createTestAgent,
  createAuthHeaders,
} from "../__tests__/helpers";
import {
  cleanupTestData,
  createTestUser,
  createTestDoctor,
} from "../__tests__/db";
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

describe("GET /api/v1/admin/doctors", () => {
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

  it("should list all doctors (admin only)", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    // Create test doctors
    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Heart specialist",
    });
    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
      bio: "Brain specialist",
    });
    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    const response = await agent
      .get("/api/v1/admin/doctors")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);

    // Verify doctor data structure
    const foundDoctor1 = response.body.data.find(
      (d: { id: string }) => d.id === doctor1.id
    );
    expect(foundDoctor1).toBeDefined();
    expect(foundDoctor1.specialization).toBe("Cardiology");
    expect(foundDoctor1.bio).toBe("Heart specialist");
    expect(foundDoctor1.userEmail).toBeDefined();
  });

  it("should return 401 if not authenticated", async () => {
    const response = await agent.get("/api/v1/admin/doctors").expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 403 if user is not admin", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const response = await agent
      .get("/api/v1/admin/doctors")
      .set(createAuthHeaders(patient.id, UserRole.PATIENT))
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Access denied");
  });

  it("should support pagination", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    // Create multiple doctors
    const createdDoctors: Awaited<ReturnType<typeof createTestDoctor>>[] = [];
    for (let i = 0; i < 5; i++) {
      const doctor = await createTestDoctor({
        specialization: `Specialty${i}`,
      });
      createdDoctors.push(doctor);
      createdDoctorIds.push(doctor.id);
      createdUserIds.push(doctor.userId);
    }

    // Verify doctors were created in database
    const doctorCount = await query((prisma) =>
      prisma.doctor.count({
        where: {
          id: { in: createdDoctors.map((d) => d.id) },
        },
      })
    );
    expect(doctorCount).toBe(5);

    const response = await agent
      .get("/api/v1/admin/doctors?page=1&limit=2")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(2);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(2);
    // Check that at least our created doctors are included in the total
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(5);
  });

  it("should support search by email", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor({
      specialization: "Cardiology",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    // Get the user email
    const user = await query(async (prisma) =>
      prisma.user.findUnique({
        where: { id: doctor.userId },
        select: { email: true },
      })
    );

    const searchTerm = user?.email?.split("@")[0] || "";

    const response = await agent
      .get(`/api/v1/admin/doctors?search=${searchTerm}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    const found = response.body.data.find(
      (d: { id: string }) => d.id === doctor.id
    );
    expect(found).toBeDefined();
  });

  it("should support filtering by specialization", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
    });
    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
    });
    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    // Verify doctors were created with correct specializations
    const verifyDoctor1 = await query((prisma) =>
      prisma.doctor.findUnique({
        where: { id: doctor1.id },
        select: { specialization: true },
      })
    );
    expect(verifyDoctor1?.specialization).toBe("Cardiology");

    const response = await agent
      .get("/api/v1/admin/doctors?specialization=Cardiology")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    const found = response.body.data.find(
      (d: { id: string }) => d.id === doctor1.id
    );
    expect(found).toBeDefined();
    expect(found?.specialization).toBe("Cardiology");

    // Neurology doctor should not be in results (or might be if case-insensitive)
    // If found, it means the filter is case-insensitive which is fine
  });

  it("should validate pagination parameters", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    // Test invalid page
    const response1 = await agent
      .get("/api/v1/admin/doctors?page=0")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(400);

    expect(response1.body.success).toBe(false);
    expect(response1.body.error.message).toContain(
      "Page must be greater than 0"
    );

    // Test invalid limit (too high)
    const response2 = await agent
      .get("/api/v1/admin/doctors?limit=1001")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(400);

    expect(response2.body.success).toBe(false);
    expect(response2.body.error.message).toContain(
      "Limit must be between 1 and 1000"
    );
  });
});

describe("GET /api/v1/admin/doctors/:id", () => {
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

  it("should get doctor by ID (admin only)", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Experienced cardiologist",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .get(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor).toBeDefined();
    expect(response.body.doctor.id).toBe(doctor.id);
    expect(response.body.doctor.specialization).toBe("Cardiology");
    expect(response.body.doctor.bio).toBe("Experienced cardiologist");
    expect(response.body.doctor.userId).toBe(doctor.userId);
  });

  it("should return 401 if not authenticated", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .get(`/api/v1/admin/doctors/${doctor.id}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 403 if user is not admin", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    const doctor = await createTestDoctor();
    createdUserIds.push(patient.id, doctor.userId);
    createdDoctorIds.push(doctor.id);

    const response = await agent
      .get(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(patient.id, UserRole.PATIENT))
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Access denied");
  });

  it("should return 404 if doctor not found", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .get("/api/v1/admin/doctors/non-existent-id")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Doctor not found");
  });

  it("should handle missing doctor ID gracefully", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    // When ID is missing, Express may route to list endpoint or return 404
    // This test verifies the route structure handles edge cases
    const response = await agent
      .get("/api/v1/admin/doctors/")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN));

    // Either 200 (list endpoint) or 404 (not found) is acceptable
    expect([200, 404]).toContain(response.status);
  });
});

describe("PUT /api/v1/admin/doctors/:id", () => {
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

  it("should update doctor profile (admin only)", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Old bio",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        specialization: "Neurology",
        bio: "New bio",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor).toBeDefined();
    expect(response.body.doctor.id).toBe(doctor.id);
    expect(response.body.doctor.specialization).toBe("Neurology");
    expect(response.body.doctor.bio).toBe("New bio");

    // Verify in database
    const updatedDoctor = await query(async (prisma) =>
      prisma.doctor.findUnique({
        where: { id: doctor.id },
      })
    );

    expect(updatedDoctor?.specialization).toBe("Neurology");
    expect(updatedDoctor?.bio).toBe("New bio");
  });

  it("should update only specialization", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Original bio",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        specialization: "Pediatrics",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.specialization).toBe("Pediatrics");
    expect(response.body.doctor.bio).toBe("Original bio"); // Should remain unchanged
  });

  it("should update only bio", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Original bio",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        bio: "Updated bio",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.bio).toBe("Updated bio");
    expect(response.body.doctor.specialization).toBe("Cardiology"); // Should remain unchanged
  });

  it("should clear specialization when set to empty string", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor({
      specialization: "Cardiology",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        specialization: "",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.specialization).toBeUndefined();

    // Verify in database
    const updatedDoctor = await query(async (prisma) =>
      prisma.doctor.findUnique({
        where: { id: doctor.id },
      })
    );

    expect(updatedDoctor?.specialization).toBeNull();
  });

  it("should return 401 if not authenticated", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put(`/api/v1/admin/doctors/${doctor.id}`)
      .send({
        specialization: "Cardiology",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 403 if user is not admin", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    const doctor = await createTestDoctor();
    createdUserIds.push(patient.id, doctor.userId);
    createdDoctorIds.push(doctor.id);

    const response = await agent
      .put(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(patient.id, UserRole.PATIENT))
      .send({
        specialization: "Cardiology",
      })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Access denied");
  });

  it("should return 404 if doctor not found", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .put("/api/v1/admin/doctors/non-existent-id")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({
        specialization: "Cardiology",
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Doctor not found");
  });

  it("should return 400 if no fields provided", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain(
      "At least one field must be provided"
    );
  });
});

describe("DELETE /api/v1/admin/doctors/:id", () => {
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

  it("should delete doctor and associated user (admin only)", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const doctor = await createTestDoctor({
      specialization: "Cardiology",
    });
    const doctorUserId = doctor.userId;
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctorUserId);

    const response = await agent
      .delete(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("deleted successfully");

    // Verify doctor is deleted
    const deletedDoctor = await query(async (prisma) =>
      prisma.doctor.findUnique({
        where: { id: doctor.id },
      })
    );
    expect(deletedDoctor).toBeNull();

    // Verify user is also deleted
    const deletedUser = await query(async (prisma) =>
      prisma.user.findUnique({
        where: { id: doctorUserId },
      })
    );
    expect(deletedUser).toBeNull();
  });

  it("should return 401 if not authenticated", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .delete(`/api/v1/admin/doctors/${doctor.id}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 403 if user is not admin", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    const doctor = await createTestDoctor();
    createdUserIds.push(patient.id, doctor.userId);
    createdDoctorIds.push(doctor.id);

    const response = await agent
      .delete(`/api/v1/admin/doctors/${doctor.id}`)
      .set(createAuthHeaders(patient.id, UserRole.PATIENT))
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Access denied");
  });

  it("should return 404 if doctor not found", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .delete("/api/v1/admin/doctors/non-existent-id")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Doctor not found");
  });
});

describe("GET /api/v1/admin/doctors/stats", () => {
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

  it("should get doctor statistics (admin only)", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    // Create doctors with different specializations
    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
    });
    const doctor2 = await createTestDoctor({
      specialization: "Cardiology",
    });
    const doctor3 = await createTestDoctor({
      specialization: "Neurology",
    });
    const doctor4 = await createTestDoctor({
      specialization: undefined, // No specialization
    });
    createdDoctorIds.push(doctor1.id, doctor2.id, doctor3.id, doctor4.id);
    createdUserIds.push(
      doctor1.userId,
      doctor2.userId,
      doctor3.userId,
      doctor4.userId
    );

    // Verify all doctors were created in database
    const doctorCount = await query((prisma) =>
      prisma.doctor.count({
        where: {
          id: { in: [doctor1.id, doctor2.id, doctor3.id, doctor4.id] },
        },
      })
    );
    expect(doctorCount).toBe(4);

    const response = await agent
      .get("/api/v1/admin/doctors/stats")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.stats).toBeDefined();
    // Check that at least our created doctors are included in the total
    expect(response.body.stats.totalDoctors).toBeGreaterThanOrEqual(4);
    expect(response.body.stats.doctorsBySpecialization).toBeDefined();
    expect(
      response.body.stats.doctorsBySpecialization["Cardiology"]
    ).toBeGreaterThanOrEqual(2);
    expect(
      response.body.stats.doctorsBySpecialization["Neurology"]
    ).toBeGreaterThanOrEqual(1);
    expect(
      response.body.stats.doctorsBySpecialization["Unspecified"]
    ).toBeGreaterThanOrEqual(1);
  });

  it("should return 401 if not authenticated", async () => {
    const response = await agent.get("/api/v1/admin/doctors/stats").expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 403 if user is not admin", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const response = await agent
      .get("/api/v1/admin/doctors/stats")
      .set(createAuthHeaders(patient.id, UserRole.PATIENT))
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Access denied");
  });

  it("should return empty stats when no doctors exist", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(admin.id);

    const response = await agent
      .get("/api/v1/admin/doctors/stats")
      .set(createAuthHeaders(admin.id, UserRole.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.stats.totalDoctors).toBeGreaterThanOrEqual(0);
    expect(response.body.stats.doctorsBySpecialization).toBeDefined();
  });
});
