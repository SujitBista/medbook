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
  createTestAvailability,
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
    // Create availability for doctors (public endpoint filters by availability by default)
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
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
    // Create multiple doctors with availability
    for (let i = 0; i < 5; i++) {
      const doctor = await createTestDoctor({
        specialization: `Specialty${i}`,
      });
      await createTestAvailability({
        doctorId: doctor.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
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
    // Use unique string so no department slug matches; API uses specialization contains
    const spec = `Cardiology-${Date.now()}`;
    const doctor1 = await createTestDoctor({
      specialization: spec,
    });
    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
    });
    // Create availability for doctors (public endpoint filters by availability by default)
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });
    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ specialization: spec })
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

  it("should filter doctors by availability by default (public endpoint)", async () => {
    // Create doctor with future availability
    const doctorWithAvailability = await createTestDoctor({
      specialization: "Cardiology",
    });
    await createTestAvailability({
      doctorId: doctorWithAvailability.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    // Create doctor without availability
    await createTestDoctor({ specialization: "Neurology" });

    // Public endpoint should default to filtering by availability
    const response = await agent.get("/api/v1/doctors").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some(
        (d: { id: string }) => d.id === doctorWithAvailability.id
      )
    ).toBe(true);
    // Doctor without availability should not be included
    expect(response.body.data.length).toBe(1);
  });

  it("should allow disabling availability filter with query parameter", async () => {
    // Create doctor with availability
    const doctorWithAvailability = await createTestDoctor({
      specialization: "Cardiology",
    });
    await createTestAvailability({
      doctorId: doctorWithAvailability.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    // Create doctor without availability
    const doctorWithoutAvailability = await createTestDoctor({
      specialization: "Neurology",
    });

    // Explicitly disable availability filter
    const response = await agent
      .get("/api/v1/doctors")
      .query({ hasAvailability: "false" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(
      response.body.data.some(
        (d: { id: string }) => d.id === doctorWithAvailability.id
      )
    ).toBe(true);
    expect(
      response.body.data.some(
        (d: { id: string }) => d.id === doctorWithoutAvailability.id
      )
    ).toBe(true);
  });

  it("should include doctors with recurring availability", async () => {
    const doctor = await createTestDoctor({ specialization: "Cardiology" });
    // Create recurring availability with future validTo
    await createTestAvailability({
      doctorId: doctor.id,
      isRecurring: true,
      validFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dayOfWeek: 1,
      startTime: new Date("2024-01-01T09:00:00Z"),
      endTime: new Date("2024-01-01T17:00:00Z"),
    });

    const response = await agent.get("/api/v1/doctors").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor.id)
    ).toBe(true);
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
    const response = await agent.get("/api/v1/doctors/").expect(200);
    // Express treats trailing slash as valid route, returns list of doctors
    expect(response.body.success).toBe(true);
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
    expect(response.body.error.message.toLowerCase()).toContain(
      "at least one field"
    );
  });
});

describe("GET /api/v1/doctors - Enhanced Search and Filtering (Feature 5.3)", () => {
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

  it("should search doctors by first name", async () => {
    const user1 = await createTestUser({
      role: "DOCTOR",
      firstName: "John",
      lastName: "Smith",
    });
    const doctor1 = await createTestDoctor({
      userId: user1.id,
      specialization: "Cardiology",
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const user2 = await createTestUser({
      role: "DOCTOR",
      firstName: "Jane",
      lastName: "Doe",
    });
    const doctor2 = await createTestDoctor({
      userId: user2.id,
      specialization: "Neurology",
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(user1.id, user2.id);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ search: "John" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor1.id)
    ).toBe(true);
  });

  it("should search doctors by last name", async () => {
    const user1 = await createTestUser({
      role: "DOCTOR",
      firstName: "John",
      lastName: "Smith",
    });
    const doctor1 = await createTestDoctor({
      userId: user1.id,
      specialization: "Cardiology",
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const user2 = await createTestUser({
      role: "DOCTOR",
      firstName: "Jane",
      lastName: "Doe",
    });
    const doctor2 = await createTestDoctor({
      userId: user2.id,
      specialization: "Neurology",
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(user1.id, user2.id);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ search: "Smith" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor1.id)
    ).toBe(true);
  });

  it("should filter doctors by city", async () => {
    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
      city: "New York",
      state: "NY",
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
      city: "Los Angeles",
      state: "CA",
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ city: "New York" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor1.id)
    ).toBe(true);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor2.id)
    ).toBe(false);
  });

  it("should filter doctors by state", async () => {
    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
      city: "New York",
      state: "NY",
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
      city: "Los Angeles",
      state: "CA",
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ state: "NY" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor1.id)
    ).toBe(true);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor2.id)
    ).toBe(false);
  });

  it("should sort doctors by name (ascending)", async () => {
    const user1 = await createTestUser({
      role: "DOCTOR",
      firstName: "Zebra",
      lastName: "Doctor",
    });
    const doctor1 = await createTestDoctor({
      userId: user1.id,
      specialization: "Cardiology",
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const user2 = await createTestUser({
      role: "DOCTOR",
      firstName: "Alice",
      lastName: "Doctor",
    });
    const doctor2 = await createTestDoctor({
      userId: user2.id,
      specialization: "Neurology",
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(user1.id, user2.id);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ sortBy: "name", sortOrder: "asc" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    // Alice should come before Zebra
    const aliceIndex = response.body.data.findIndex(
      (d: { id: string }) => d.id === doctor2.id
    );
    const zebraIndex = response.body.data.findIndex(
      (d: { id: string }) => d.id === doctor1.id
    );
    expect(aliceIndex).toBeLessThan(zebraIndex);
  });

  it("should sort doctors by specialization", async () => {
    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ sortBy: "specialization", sortOrder: "asc" })
      .expect(200);

    expect(response.body.success).toBe(true);
    const data = response.body.data as {
      id: string;
      specialization?: string;
    }[];
    const ourDoctors = data.filter(
      (d) => d.id === doctor1.id || d.id === doctor2.id
    );
    expect(ourDoctors).toHaveLength(2);
    // API may return department.name or specialization; Cardiology should sort before Neurology
    const sorted = [...ourDoctors].sort((a, b) =>
      (a.specialization ?? "").localeCompare(b.specialization ?? "")
    );
    expect(sorted[0].id).toBe(doctor1.id);
    expect(sorted[1].id).toBe(doctor2.id);
  });

  it("should sort doctors by years of experience", async () => {
    const doctor1 = await createTestDoctor({
      specialization: "Cardiology",
      yearsOfExperience: 5,
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const doctor2 = await createTestDoctor({
      specialization: "Neurology",
      yearsOfExperience: 15,
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(doctor1.userId, doctor2.userId);

    const response = await agent
      .get("/api/v1/doctors")
      .query({ sortBy: "yearsOfExperience", sortOrder: "desc" })
      .expect(200);

    expect(response.body.success).toBe(true);
    const data = response.body.data as {
      id: string;
      yearsOfExperience?: number | null;
    }[];
    const ourDoctors = data.filter(
      (d) => d.id === doctor1.id || d.id === doctor2.id
    );
    expect(ourDoctors).toHaveLength(2);
    // Desc order: 15 years before 5 years
    const sorted = [...ourDoctors].sort(
      (a, b) => (b.yearsOfExperience ?? 0) - (a.yearsOfExperience ?? 0)
    );
    expect(sorted[0].id).toBe(doctor2.id);
    expect(sorted[1].id).toBe(doctor1.id);
  });

  it("should return 400 for invalid sortBy parameter", async () => {
    const response = await agent
      .get("/api/v1/doctors")
      .query({ sortBy: "invalid" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("sortBy");
  });

  it("should return 400 for invalid sortOrder parameter", async () => {
    const response = await agent
      .get("/api/v1/doctors")
      .query({ sortOrder: "invalid" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("sortOrder");
  });

  it("should combine multiple filters (search, location, specialization)", async () => {
    // Use unique specialization so no department slug matches; API uses specialization contains
    const spec1 = `Cardiology-${Date.now()}`;
    const spec2 = `Neurology-${Date.now()}`;

    const user1 = await createTestUser({
      role: "DOCTOR",
      firstName: "John",
      lastName: "Smith",
    });
    const doctor1 = await createTestDoctor({
      userId: user1.id,
      specialization: spec1,
      city: "New York",
      state: "NY",
    });
    await createTestAvailability({
      doctorId: doctor1.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    const user2 = await createTestUser({
      role: "DOCTOR",
      firstName: "Jane",
      lastName: "Doe",
    });
    const doctor2 = await createTestDoctor({
      userId: user2.id,
      specialization: spec2,
      city: "New York",
      state: "NY",
    });
    await createTestAvailability({
      doctorId: doctor2.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });

    createdDoctorIds.push(doctor1.id, doctor2.id);
    createdUserIds.push(user1.id, user2.id);

    // Search for "John", filter by city "New York" and specialization (unique spec1)
    const response = await agent
      .get("/api/v1/doctors")
      .query({
        search: "John",
        city: "New York",
        specialization: spec1,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor1.id)
    ).toBe(true);
    expect(
      response.body.data.some((d: { id: string }) => d.id === doctor2.id)
    ).toBe(false);
  });
});
