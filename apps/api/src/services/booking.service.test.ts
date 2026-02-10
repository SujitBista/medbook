/**
 * Booking service tests (capacity-based)
 * - Admin manual booking assigns next token and respects capacity
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createSchedule } from "./schedule.service";
import { createManualBooking } from "./booking.service";
import { query } from "@app/db";
import {
  createTestDoctor,
  createTestUser,
  cleanupTestData,
} from "../__tests__/db";

type AppointmentRow = {
  status: string;
  paymentStatus: string;
  queueNumber: number | null;
};

describe("booking.service", () => {
  let doctorId: string;
  let patientId: string;
  let scheduleId: string;
  const date = "2026-02-20";

  beforeEach(async () => {
    await cleanupTestData();
    const doctor = await createTestDoctor();
    const patient = await createTestUser({ role: "PATIENT" });
    doctorId = doctor.id;
    patientId = patient.id;
    const schedule = await createSchedule({
      doctorId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 2,
    });
    scheduleId = schedule.id;
  });

  it("should create manual booking with queue number 1", async () => {
    const result = await createManualBooking({
      scheduleId,
      patientId,
      paymentProvider: "CASH",
    });

    expect(result.id).toBeDefined();
    expect(result.queueNumber).toBe(1);

    const appointment = await query((prisma) =>
      prisma.appointment.findUnique({
        where: { id: result.id },
        select: { status: true, paymentStatus: true, queueNumber: true },
      })
    );
    const row = appointment as AppointmentRow | null;
    expect(row?.status).toBe("CONFIRMED");
    expect(row?.paymentStatus).toBe("PAID");
    expect(row?.queueNumber).toBe(1);
  });

  it("should assign next token for second manual booking", async () => {
    await createManualBooking({
      scheduleId,
      patientId,
      paymentProvider: "CASH",
    });
    const patient2 = await createTestUser({ role: "PATIENT" });
    const result2 = await createManualBooking({
      scheduleId,
      patientId: patient2.id,
      paymentProvider: "CASH",
    });

    expect(result2.queueNumber).toBe(2);
  });

  it("should reject manual booking when schedule is full", async () => {
    await createManualBooking({
      scheduleId,
      patientId,
      paymentProvider: "CASH",
    });
    const patient2 = await createTestUser({ role: "PATIENT" });
    await createManualBooking({
      scheduleId,
      patientId: patient2.id,
      paymentProvider: "CASH",
    });
    const patient3 = await createTestUser({ role: "PATIENT" });

    await expect(
      createManualBooking({
        scheduleId,
        patientId: patient3.id,
        paymentProvider: "CASH",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("full"),
    });
  });
});
