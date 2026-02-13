/**
 * Booking service tests (capacity-based)
 * - Admin manual booking assigns next token and respects capacity
 * - startBooking rejects missing/invalid schedule, past schedule, and zero amount
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSchedule } from "./schedule.service";
import { createManualBooking, startBooking } from "./booking.service";
import { query } from "@app/db";
import {
  createTestDoctor,
  createTestUser,
  createTestSchedule,
  cleanupTestData,
} from "../__tests__/db";
import type { DoctorCommissionSettings } from "@medbook/types";
import * as commissionService from "./commission.service";
import * as stripeConfig from "../config/stripe";

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

  describe("startBooking", () => {
    it("should reject non-existent scheduleId with 404", async () => {
      await expect(
        startBooking("00000000-0000-0000-0000-000000000000", patientId)
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        statusCode: 404,
        message: expect.stringContaining("Schedule"),
      });
    });

    it("should reject schedule in the past with 400", async () => {
      // Use createTestSchedule (Prisma directly) so we can create a past-dated schedule;
      // createSchedule() rejects past dates.
      const pastSchedule = await createTestSchedule({
        doctorId,
        date: new Date("2020-01-01T00:00:00.000Z"),
        startTime: "09:00",
        endTime: "10:00",
        maxPatients: 5,
      });
      await expect(
        startBooking(pastSchedule.id, patientId)
      ).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        statusCode: 400,
        message: expect.stringContaining("past"),
      });
    });

    it("should reject when appointment price is 0 with 422", async () => {
      vi.spyOn(
        commissionService,
        "getCommissionSettingsByDoctorId"
      ).mockResolvedValueOnce({
        id: "cs-1",
        doctorId,
        appointmentPrice: 0,
        commissionRate: 0.1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DoctorCommissionSettings);
      vi.spyOn(stripeConfig, "isStripeConfigured").mockReturnValueOnce(true);

      await expect(startBooking(scheduleId, patientId)).rejects.toMatchObject({
        code: "INVALID_AMOUNT",
        statusCode: 422,
        message: expect.stringContaining("greater than zero"),
      });

      vi.restoreAllMocks();
    });
  });
});
