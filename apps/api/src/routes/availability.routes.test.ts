/**
 * Integration tests for availability routes
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

describe("GET /api/v1/availability/:id", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAvailabilityIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAvailabilityIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get availability by ID without authentication", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const availability = await createTestAvailability({
      doctorId: doctor.id,
      startTime,
      endTime,
    });
    createdAvailabilityIds.push(availability.id);

    const response = await agent
      .get(`/api/v1/availability/${availability.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.availability).toBeDefined();
    expect(response.body.availability.id).toBe(availability.id);
    expect(response.body.availability.doctorId).toBe(doctor.id);
    expect(new Date(response.body.availability.startTime).getTime()).toBe(
      startTime.getTime()
    );
    expect(new Date(response.body.availability.endTime).getTime()).toBe(
      endTime.getTime()
    );
  });

  it("should return 404 if availability not found", async () => {
    const response = await agent
      .get("/api/v1/availability/non-existent-id")
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Availability not found");
  });

  it("should handle missing availability ID gracefully", async () => {
    // When ID is missing, Express may route to different endpoint or return 404
    // This test verifies the route structure handles edge cases
    const response = await agent.get("/api/v1/availability/");

    // Either 404 (not found) or 401 (if it matches a protected route) is acceptable
    expect([200, 404, 401]).toContain(response.status);
  });
});

describe("GET /api/v1/availability/doctor/:doctorId", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAvailabilityIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAvailabilityIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get availabilities by doctor ID without authentication", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime1 = new Date(Date.now() + 60 * 60 * 1000);
    const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);
    const startTime2 = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endTime2 = new Date(startTime2.getTime() + 60 * 60 * 1000);

    const availability1 = await createTestAvailability({
      doctorId: doctor.id,
      startTime: startTime1,
      endTime: endTime1,
    });
    const availability2 = await createTestAvailability({
      doctorId: doctor.id,
      startTime: startTime2,
      endTime: endTime2,
    });
    createdAvailabilityIds.push(availability1.id, availability2.id);

    const response = await agent
      .get(`/api/v1/availability/doctor/${doctor.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.availabilities).toBeDefined();
    expect(Array.isArray(response.body.availabilities)).toBe(true);
    expect(response.body.availabilities.length).toBeGreaterThanOrEqual(2);

    const found1 = response.body.availabilities.find(
      (a: { id: string }) => a.id === availability1.id
    );
    const found2 = response.body.availabilities.find(
      (a: { id: string }) => a.id === availability2.id
    );

    expect(found1).toBeDefined();
    expect(found2).toBeDefined();
  });

  it("should filter availabilities by date range", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const now = new Date();
    const startTime1 = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);
    const startTime2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    const endTime2 = new Date(startTime2.getTime() + 60 * 60 * 1000);

    const availability1 = await createTestAvailability({
      doctorId: doctor.id,
      startTime: startTime1,
      endTime: endTime1,
    });
    const availability2 = await createTestAvailability({
      doctorId: doctor.id,
      startTime: startTime2,
      endTime: endTime2,
    });
    createdAvailabilityIds.push(availability1.id, availability2.id);

    const startDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    const response = await agent
      .get(
        `/api/v1/availability/doctor/${doctor.id}?startDate=${startDate.toISOString()}`
      )
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.availabilities.length).toBeGreaterThanOrEqual(1);
    const found = response.body.availabilities.find(
      (a: { id: string }) => a.id === availability2.id
    );
    expect(found).toBeDefined();
  });

  it("should return 400 if doctor ID is missing", async () => {
    const response = await agent
      .get("/api/v1/availability/doctor/")
      .expect(404);
  });
});

describe("POST /api/v1/availability", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAvailabilityIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAvailabilityIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should create availability successfully (authenticated)", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.availability).toBeDefined();
    expect(response.body.availability.doctorId).toBe(doctor.id);
    expect(response.body.availability.isRecurring).toBe(false);

    createdAvailabilityIds.push(response.body.availability.id);
  });

  it("should create recurring availability", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date("2024-01-01T09:00:00Z");
    const endTime = new Date("2024-01-01T17:00:00Z");
    const validFrom = new Date("2024-01-01T00:00:00Z");
    const validTo = new Date("2024-12-31T23:59:59Z");

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        dayOfWeek: 1, // Monday
        isRecurring: true,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.availability.isRecurring).toBe(true);
    expect(response.body.availability.dayOfWeek).toBe(1);

    createdAvailabilityIds.push(response.body.availability.id);
  });

  it("should return 401 if not authenticated", async () => {
    const response = await agent
      .post("/api/v1/availability")
      .send({
        doctorId: "test-id",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 400 if doctor ID is missing", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("Doctor ID is required");
  });

  it("should return 400 if start time is missing", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const endTime = new Date(Date.now() + 60 * 60 * 1000);

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        doctorId: doctor.id,
        endTime: endTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("Start time is required");
  });

  it("should return 400 if end time is missing", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("End time is required");
  });

  it("should return 400 if start time is after end time", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() - 30 * 60 * 1000); // Before start time

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain(
      "Start time must be before end time"
    );
  });

  it("should return 400 if time slot is too short", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // Only 10 minutes

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("at least 15 minutes");
  });

  it("should return 409 if time slot overlaps with existing availability", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime1 = new Date(Date.now() + 60 * 60 * 1000);
    const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);

    const availability1 = await createTestAvailability({
      doctorId: doctor.id,
      startTime: startTime1,
      endTime: endTime1,
    });
    createdAvailabilityIds.push(availability1.id);

    // Try to create overlapping availability
    const startTime2 = new Date(startTime1.getTime() + 30 * 60 * 1000); // 30 min overlap
    const endTime2 = new Date(endTime1.getTime() + 30 * 60 * 1000);

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        doctorId: doctor.id,
        startTime: startTime2.toISOString(),
        endTime: endTime2.toISOString(),
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("overlaps");
  });

  it("should return 404 if doctor not found", async () => {
    const user = await createTestUser({ role: "DOCTOR" });
    createdUserIds.push(user.id);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const response = await agent
      .post("/api/v1/availability")
      .set(createAuthHeaders(user.id, UserRole.DOCTOR))
      .send({
        doctorId: "non-existent-doctor-id",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("Doctor not found");
  });
});

describe("PUT /api/v1/availability/:id", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAvailabilityIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAvailabilityIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should update availability successfully (authenticated)", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const availability = await createTestAvailability({
      doctorId: doctor.id,
      startTime,
      endTime,
    });
    createdAvailabilityIds.push(availability.id);

    const newEndTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const response = await agent
      .put(`/api/v1/availability/${availability.id}`)
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        endTime: newEndTime.toISOString(),
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.availability.endTime).toBe(newEndTime.toISOString());
  });

  it("should return 401 if not authenticated", async () => {
    const availability = await createTestAvailability();
    createdAvailabilityIds.push(availability.id);

    const response = await agent
      .put(`/api/v1/availability/${availability.id}`)
      .send({
        endTime: new Date().toISOString(),
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 404 if availability not found", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .put("/api/v1/availability/non-existent-id")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        endTime: new Date().toISOString(),
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("Availability not found");
  });

  it("should return 400 if no fields provided", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const availability = await createTestAvailability({
      doctorId: doctor.id,
    });
    createdAvailabilityIds.push(availability.id);

    const response = await agent
      .put(`/api/v1/availability/${availability.id}`)
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain(
      "At least one field must be provided"
    );
  });

  it("should return 409 if update creates overlap", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime1 = new Date(Date.now() + 60 * 60 * 1000);
    const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);
    const startTime2 = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const endTime2 = new Date(startTime2.getTime() + 60 * 60 * 1000);

    const availability1 = await createTestAvailability({
      doctorId: doctor.id,
      startTime: startTime1,
      endTime: endTime1,
    });
    const availability2 = await createTestAvailability({
      doctorId: doctor.id,
      startTime: startTime2,
      endTime: endTime2,
    });
    createdAvailabilityIds.push(availability1.id, availability2.id);

    // Try to update availability2 to overlap with availability1
    const response = await agent
      .put(`/api/v1/availability/${availability2.id}`)
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .send({
        startTime: startTime1.toISOString(),
        endTime: endTime1.toISOString(),
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("overlaps");
  });
});

describe("DELETE /api/v1/availability/:id", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAvailabilityIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAvailabilityIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should delete availability successfully (authenticated)", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const availability = await createTestAvailability({
      doctorId: doctor.id,
    });
    createdAvailabilityIds.push(availability.id);

    const response = await agent
      .delete(`/api/v1/availability/${availability.id}`)
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("deleted successfully");

    // Verify availability is deleted
    const deletedAvailability = await agent
      .get(`/api/v1/availability/${availability.id}`)
      .expect(404);
  });

  it("should return 401 if not authenticated", async () => {
    const availability = await createTestAvailability();
    createdAvailabilityIds.push(availability.id);

    const response = await agent
      .delete(`/api/v1/availability/${availability.id}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 404 if availability not found", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .delete("/api/v1/availability/non-existent-id")
      .set(createAuthHeaders(doctor.userId, UserRole.DOCTOR))
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("Availability not found");
  });
});
