/**
 * Integration tests for appointment routes
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
  createTestAppointment,
} from "../__tests__/db";
import { UserRole, AppointmentStatus } from "@medbook/types";

describe("GET /api/v1/appointments/:id", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAppointmentIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get appointment by ID with authentication", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const appointment = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      startTime,
      endTime,
    });
    createdAppointmentIds.push(appointment.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .get(`/api/v1/appointments/${appointment.id}`)
      .set(headers)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(appointment.id);
    expect(response.body.data.patientId).toBe(patient.id);
    expect(response.body.data.doctorId).toBe(doctor.id);
    expect(new Date(response.body.data.startTime).getTime()).toBe(
      startTime.getTime()
    );
    expect(new Date(response.body.data.endTime).getTime()).toBe(
      endTime.getTime()
    );
  });

  it("should return 404 if appointment not found", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .get("/api/v1/appointments/non-existent-id")
      .set(headers)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Appointment not found");
  });

  it("should require authentication", async () => {
    const response = await agent
      .get("/api/v1/appointments/some-id")
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

describe("GET /api/v1/appointments/patient/:patientId", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAppointmentIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get appointments by patient ID", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime1 = new Date(Date.now() + 60 * 60 * 1000);
    const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);
    const startTime2 = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endTime2 = new Date(startTime2.getTime() + 60 * 60 * 1000);

    const appointment1 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      startTime: startTime1,
      endTime: endTime1,
    });
    const appointment2 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      startTime: startTime2,
      endTime: endTime2,
    });
    createdAppointmentIds.push(appointment1.id, appointment2.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .get(`/api/v1/appointments/patient/${patient.id}`)
      .set(headers)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);

    const found1 = response.body.data.find(
      (a: { id: string }) => a.id === appointment1.id
    );
    const found2 = response.body.data.find(
      (a: { id: string }) => a.id === appointment2.id
    );

    expect(found1).toBeDefined();
    expect(found2).toBeDefined();
  });

  it("should filter appointments by status", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const appointment1 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      status: "PENDING",
    });
    const appointment2 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      status: "CONFIRMED",
    });
    createdAppointmentIds.push(appointment1.id, appointment2.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .get(`/api/v1/appointments/patient/${patient.id}?status=PENDING`)
      .set(headers)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    const pendingAppointments = response.body.data.filter(
      (a: { status: string }) => a.status === "PENDING"
    );
    expect(pendingAppointments.length).toBeGreaterThanOrEqual(1);
    expect(
      pendingAppointments.some((a: { id: string }) => a.id === appointment1.id)
    ).toBe(true);
  });

  it("should filter appointments by date range", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    // Create availability slots first
    const startTime1 = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);
    const startTime2 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
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

    const appointment1 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      availabilityId: availability1.id,
      startTime: startTime1,
      endTime: endTime1,
    });
    const appointment2 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      availabilityId: availability2.id,
      startTime: startTime2,
      endTime: endTime2,
    });
    createdAppointmentIds.push(appointment1.id, appointment2.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    // Filter for appointments starting from tomorrow to 2 days from now
    // This should include appointment1 but not appointment2
    const startDate = new Date(startTime1.getTime() - 60 * 60 * 1000); // 1 hour before appointment1
    const endDate = new Date(startTime1.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days after appointment1

    const response = await agent
      .get(
        `/api/v1/appointments/patient/${patient.id}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      .set(headers)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    // Should include appointment1
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    const foundAppointment1 = response.body.data.find(
      (a: { id: string }) => a.id === appointment1.id
    );
    expect(foundAppointment1).toBeDefined();
  });

  it("should require authentication", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const response = await agent
      .get(`/api/v1/appointments/patient/${patient.id}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

describe("GET /api/v1/appointments/doctor/:doctorId", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAppointmentIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should get appointments by doctor ID", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime1 = new Date(Date.now() + 60 * 60 * 1000);
    const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);
    const startTime2 = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endTime2 = new Date(startTime2.getTime() + 60 * 60 * 1000);

    const appointment1 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      startTime: startTime1,
      endTime: endTime1,
    });
    const appointment2 = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      startTime: startTime2,
      endTime: endTime2,
    });
    createdAppointmentIds.push(appointment1.id, appointment2.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .get(`/api/v1/appointments/doctor/${doctor.id}`)
      .set(headers)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);

    const found1 = response.body.data.find(
      (a: { id: string }) => a.id === appointment1.id
    );
    const found2 = response.body.data.find(
      (a: { id: string }) => a.id === appointment2.id
    );

    expect(found1).toBeDefined();
    expect(found2).toBeDefined();
  });

  it("should require authentication", async () => {
    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const response = await agent
      .get(`/api/v1/appointments/doctor/${doctor.id}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

describe("POST /api/v1/appointments", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAvailabilityIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAvailabilityIds.length = 0;
    createdAppointmentIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should create appointment with valid data", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

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

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .post("/api/v1/appointments")
      .set(headers)
      .send({
        patientId: patient.id,
        doctorId: doctor.id,
        availabilityId: availability.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: "Test appointment",
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.patientId).toBe(patient.id);
    expect(response.body.data.doctorId).toBe(doctor.id);
    expect(response.body.data.status).toBe("PENDING");
    expect(response.body.data.notes).toBe("Test appointment");
    createdAppointmentIds.push(response.body.data.id);
  });

  it("should create appointment without availabilityId", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Create availability that matches the appointment time
    const availability = await createTestAvailability({
      doctorId: doctor.id,
      startTime,
      endTime,
    });
    createdAvailabilityIds.push(availability.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .post("/api/v1/appointments")
      .set(headers)
      .send({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    createdAppointmentIds.push(response.body.data.id);
  });

  it("should reject appointment outside doctor availability", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    // Create availability for a different time
    const availabilityStartTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const availabilityEndTime = new Date(
      availabilityStartTime.getTime() + 60 * 60 * 1000
    );
    const availability = await createTestAvailability({
      doctorId: doctor.id,
      startTime: availabilityStartTime,
      endTime: availabilityEndTime,
    });
    createdAvailabilityIds.push(availability.id);

    // Try to book appointment at a different time
    const appointmentStartTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const appointmentEndTime = new Date(
      appointmentStartTime.getTime() + 60 * 60 * 1000
    );

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .post("/api/v1/appointments")
      .set(headers)
      .send({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: appointmentStartTime.toISOString(),
        endTime: appointmentEndTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("availability");
  });

  it("should reject appointment with time conflict", async () => {
    const patient1 = await createTestUser({ role: "PATIENT" });
    const patient2 = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient1.id, patient2.id);

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

    // Create first appointment
    const appointment1 = await createTestAppointment({
      patientId: patient1.id,
      doctorId: doctor.id,
      availabilityId: availability.id,
      startTime,
      endTime,
    });
    createdAppointmentIds.push(appointment1.id);

    // Try to create conflicting appointment
    const headers = createAuthHeaders(patient2.id, patient2.role as UserRole);

    const response = await agent
      .post("/api/v1/appointments")
      .set(headers)
      .send({
        patientId: patient2.id,
        doctorId: doctor.id,
        availabilityId: availability.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("conflict");
  });

  it("should reject appointment in the past", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const pastStartTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const pastEndTime = new Date(pastStartTime.getTime() + 60 * 60 * 1000);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .post("/api/v1/appointments")
      .set(headers)
      .send({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: pastStartTime.toISOString(),
        endTime: pastEndTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("future");
  });

  it("should reject appointment with invalid time slot", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = startTime; // End time same as start time (invalid)

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .post("/api/v1/appointments")
      .set(headers)
      .send({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should require authentication", async () => {
    const response = await agent
      .post("/api/v1/appointments")
      .send({
        patientId: "some-id",
        doctorId: "some-id",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should validate required fields", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .post("/api/v1/appointments")
      .set(headers)
      .send({
        // Missing required fields
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

describe("PUT /api/v1/appointments/:id", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);
  const createdUserIds: string[] = [];
  const createdDoctorIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  beforeEach(async () => {
    createdUserIds.length = 0;
    createdDoctorIds.length = 0;
    createdAppointmentIds.length = 0;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should update appointment status", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const appointment = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      status: "PENDING",
    });
    createdAppointmentIds.push(appointment.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .put(`/api/v1/appointments/${appointment.id}`)
      .set(headers)
      .send({
        status: "CONFIRMED",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.status).toBe("CONFIRMED");
  });

  it("should update appointment notes", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const doctor = await createTestDoctor();
    createdDoctorIds.push(doctor.id);
    createdUserIds.push(doctor.userId);

    const appointment = await createTestAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
    });
    createdAppointmentIds.push(appointment.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .put(`/api/v1/appointments/${appointment.id}`)
      .set(headers)
      .send({
        notes: "Updated notes",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.notes).toBe("Updated notes");
  });

  it("should return 404 if appointment not found", async () => {
    const patient = await createTestUser({ role: "PATIENT" });
    createdUserIds.push(patient.id);

    const headers = createAuthHeaders(patient.id, patient.role as UserRole);

    const response = await agent
      .put("/api/v1/appointments/non-existent-id")
      .set(headers)
      .send({
        status: "CONFIRMED",
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toContain("Appointment not found");
  });

  it("should require authentication", async () => {
    const response = await agent
      .put("/api/v1/appointments/some-id")
      .send({
        status: "CONFIRMED",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});
