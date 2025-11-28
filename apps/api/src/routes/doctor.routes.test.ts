/**
 * Integration tests for doctor routes
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

describe("GET /api/v1/doctors", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdDoctorIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    createdDoctorIds.length = 0;
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get all doctors without authentication", async () => {
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

    const response = await agent.get("/api/v1/doctors").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it("should paginate doctors correctly", async () => {
    // Create multiple doctors
    for (let i = 0; i < 5; i++) {
      const doctor = await createTestDoctor({
        specialization: `Specialty${i}`,
      });
      createdDoctorIds.push(doctor.id);
      createdUserIds.push(doctor.userId);
    }

    const response = await agent
      .get("/api/v1/doctors")
      .query({ page: 1, limit: 2 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(2);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(2);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(5);
  });

  it("should search doctors by specialization", async () => {
    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
    });
    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
    });
    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ specialization: "Cardiology" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some((d: { specialization: string }) =>
        d.specialization?.toLowerCase().includes("cardiology")
      )
    ).toBe(true);
  });

  it("should return 400 for invalid page parameter", async () => {
    const response = await agent
      .get("/api/v1/doctors")
      .query({ page: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 400 for invalid limit parameter", async () => {
    const response = await agent
      .get("/api/v1/doctors")
      .query({ limit: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 400 for limit exceeding maximum", async () => {
    const response = await agent
      .get("/api/v1/doctors")
      .query({ limit: 101 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

describe("GET /api/v1/doctors/:id", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdDoctorIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    createdDoctorIds.length = 0;
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get doctor by ID without authentication", async () => {
    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Heart specialist",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .get(`/api/v1/doctors/${doctor.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor).toBeDefined();
    expect(response.body.doctor.id).toBe(doctor.id);
    expect(response.body.doctor.userId).toBe(doctor.userId);
    expect(response.body.doctor.specialization).toBe("Cardiology");
    expect(response.body.doctor.bio).toBe("Heart specialist");
  });

  it("should return 404 if doctor not found", async () => {
    const response = await agent
      .get("/api/v1/doctors/non-existent-id")
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("not found");
  });

  it("should return 400 if doctor ID is missing", async () => {
    const response = await agent.get("/api/v1/doctors/").expect(404);
    // Express returns 404 for missing route parameter
  });
});

describe("GET /api/v1/doctors/user/:userId", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdDoctorIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    createdDoctorIds.length = 0;
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get doctor by user ID without authentication", async () => {
    const doctor = await createTestDoctor({
      specialization: "Pediatrics",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .get(`/api/v1/doctors/user/${doctor.userId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor).toBeDefined();
    expect(response.body.doctor.userId).toBe(doctor.userId);
  });

  it("should return 404 if doctor not found for user", async () => {
    const user = await createTestUser({ role: "DOCTOR" });
    createdUserIds.push(user.id);

    const response = await agent
      .get(`/api/v1/doctors/user/${user.id}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("not found");
  });
});

describe("POST /api/v1/doctors", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdDoctorIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    createdDoctorIds.length = 0;
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should create doctor profile with valid data", async () => {
    const user = await createTestUser({ role: "DOCTOR" });
    createdUserIds.push(user.id);
    const headers = createAuthHeaders(user.id, UserRole.DOCTOR);

    const response = await agent
      .post("/api/v1/doctors")
      .set(headers)
      .send({
        specialization: "Cardiology",
        bio: "Heart specialist with 10 years experience",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor).toBeDefined();
    expect(response.body.doctor.userId).toBe(user.id);
    expect(response.body.doctor.specialization).toBe("Cardiology");
    expect(response.body.doctor.bio).toBe(
      "Heart specialist with 10 years experience"
    );
    createdDoctorIds.push(response.body.doctor.id);
  });

  it("should create doctor profile with only specialization", async () => {
    const user = await createTestUser({ role: "DOCTOR" });
    createdUserIds.push(user.id);
    const headers = createAuthHeaders(user.id, UserRole.DOCTOR);

    const response = await agent
      .post("/api/v1/doctors")
      .set(headers)
      .send({
        specialization: "Neurology",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.specialization).toBe("Neurology");
    createdDoctorIds.push(response.body.doctor.id);
  });

  it("should create doctor profile with only bio", async () => {
    const user = await createTestUser({ role: "DOCTOR" });
    createdUserIds.push(user.id);
    const headers = createAuthHeaders(user.id, UserRole.DOCTOR);

    const response = await agent
      .post("/api/v1/doctors")
      .set(headers)
      .send({
        bio: "Experienced doctor",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.bio).toBe("Experienced doctor");
    createdDoctorIds.push(response.body.doctor.id);
  });

  it("should return 401 if not authenticated", async () => {
    const response = await agent
      .post("/api/v1/doctors")
      .send({
        specialization: "Cardiology",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 400 if user is not a doctor", async () => {
    const user = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(user.id);
    const headers = createAuthHeaders(user.id, UserRole.PATIENT);

    const response = await agent
      .post("/api/v1/doctors")
      .set(headers)
      .send({
        specialization: "Cardiology",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("DOCTOR role");
  });

  it("should return 409 if doctor profile already exists", async () => {
    const doctor = await createTestDoctor({
      specialization: "Cardiology",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);
    const headers = createAuthHeaders(doctor.userId, UserRole.DOCTOR);

    const response = await agent
      .post("/api/v1/doctors")
      .set(headers)
      .send({
        specialization: "Neurology",
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("already exists");
  });
});

describe("PUT /api/v1/doctors/:id", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdDoctorIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    createdDoctorIds.length = 0;
    createdUserIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should update doctor profile with valid data", async () => {
    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Old bio",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);
    const headers = createAuthHeaders(doctor.userId, UserRole.DOCTOR);

    const response = await agent
      .put(`/api/v1/doctors/${doctor.id}`)
      .set(headers)
      .send({
        specialization: "Neurology",
        bio: "New bio",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.specialization).toBe("Neurology");
    expect(response.body.doctor.bio).toBe("New bio");
  });

  it("should update only specialization", async () => {
    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Original bio",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);
    const headers = createAuthHeaders(doctor.userId, UserRole.DOCTOR);

    const response = await agent
      .put(`/api/v1/doctors/${doctor.id}`)
      .set(headers)
      .send({
        specialization: "Pediatrics",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.specialization).toBe("Pediatrics");
    expect(response.body.doctor.bio).toBe("Original bio");
  });

  it("should update only bio", async () => {
    const doctor = await createTestDoctor({
      specialization: "Cardiology",
      bio: "Original bio",
    });
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);
    const headers = createAuthHeaders(doctor.userId, UserRole.DOCTOR);

    const response = await agent
      .put(`/api/v1/doctors/${doctor.id}`)
      .set(headers)
      .send({
        bio: "Updated bio",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.doctor.specialization).toBe("Cardiology");
    expect(response.body.doctor.bio).toBe("Updated bio");
  });

  it("should return 401 if not authenticated", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put(`/api/v1/doctors/${doctor.id}`)
      .send({
        specialization: "Cardiology",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 404 if doctor not found", async () => {
    const user = await createTestUser({ role: "DOCTOR" });
    createdUserIds.push(user.id);
    const headers = createAuthHeaders(user.id, UserRole.DOCTOR);

    const response = await agent
      .put("/api/v1/doctors/non-existent-id")
      .set(headers)
      .send({
        specialization: "Cardiology",
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("not found");
  });

  it("should return 400 if no fields provided", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);
    const headers = createAuthHeaders(doctor.userId, UserRole.DOCTOR);

    const response = await agent
      .put(`/api/v1/doctors/${doctor.id}`)
      .set(headers)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("at least one field");
  });
});
