/**
 * Integration tests for appointment archive job
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { archiveExpiredAppointments } from "./appointment-archive.job";
import {
  cleanupTestData,
  createTestUser,
  createTestDoctor,
  createTestAppointment,
} from "../__tests__/db";
import * as db from "@app/db";
import { AppointmentStatus } from "@medbook/types";

// Mock logger
vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("appointment-archive.job", () => {
  beforeEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("archiveExpiredAppointments", () => {
    it("should archive appointments with endTime < now()", async () => {
      const now = new Date();
      const pastEndTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const pastStartTime = new Date(pastEndTime.getTime() - 30 * 60 * 1000); // 30 min before end

      // Create patient and doctor
      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      // Create expired appointment
      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: pastStartTime,
        endTime: pastEndTime,
        status: AppointmentStatus.COMPLETED,
      });

      // Verify appointment is not archived initially
      const beforeArchive = await db.query((prisma) =>
        prisma.appointment.findUnique({
          where: { id: appointment.id },
          select: { isArchived: true },
        })
      );

      expect(beforeArchive?.isArchived).toBe(false);

      // Run archive job
      const archivedCount = await archiveExpiredAppointments();

      expect(archivedCount).toBe(1);

      // Verify appointment is now archived
      const afterArchive = await db.query((prisma) =>
        prisma.appointment.findUnique({
          where: { id: appointment.id },
          select: { isArchived: true },
        })
      );

      expect(afterArchive?.isArchived).toBe(true);
    });

    it("should not archive appointments with endTime >= now()", async () => {
      const now = new Date();
      const futureEndTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const futureStartTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now

      // Create patient and doctor
      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      // Create future appointment
      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: futureStartTime,
        endTime: futureEndTime,
        status: AppointmentStatus.CONFIRMED,
      });

      // Run archive job
      const archivedCount = await archiveExpiredAppointments();

      expect(archivedCount).toBe(0);

      // Verify appointment is still not archived
      const afterArchive = await db.query((prisma) =>
        prisma.appointment.findUnique({
          where: { id: appointment.id },
          select: { isArchived: true },
        })
      );

      expect(afterArchive?.isArchived).toBe(false);
    });

    it("should not re-archive already archived appointments", async () => {
      const now = new Date();
      const pastEndTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const pastStartTime = new Date(pastEndTime.getTime() - 30 * 60 * 1000); // 30 min before end

      // Create patient and doctor
      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      // Create expired appointment and manually archive it
      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: pastStartTime,
        endTime: pastEndTime,
        status: AppointmentStatus.COMPLETED,
      });

      // Manually archive the appointment
      await db.query((prisma) =>
        prisma.appointment.update({
          where: { id: appointment.id },
          data: { isArchived: true },
        })
      );

      // Run archive job
      const archivedCount = await archiveExpiredAppointments();

      // Should not archive again (already archived)
      expect(archivedCount).toBe(0);

      // Verify appointment is still archived
      const afterArchive = await db.query((prisma) =>
        prisma.appointment.findUnique({
          where: { id: appointment.id },
          select: { isArchived: true },
        })
      );

      expect(afterArchive?.isArchived).toBe(true);
    });

    it("should archive multiple expired appointments", async () => {
      const now = new Date();
      const pastEndTime1 = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const pastStartTime1 = new Date(pastEndTime1.getTime() - 30 * 60 * 1000);
      const pastEndTime2 = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const pastStartTime2 = new Date(pastEndTime2.getTime() - 30 * 60 * 1000);

      // Create patients and doctor
      const patient1 = await createTestUser({ role: "PATIENT" });
      const patient2 = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      // Create two expired appointments
      const appointment1 = await createTestAppointment({
        patientId: patient1.id,
        doctorId: doctor.id,
        startTime: pastStartTime1,
        endTime: pastEndTime1,
        status: AppointmentStatus.COMPLETED,
      });

      const appointment2 = await createTestAppointment({
        patientId: patient2.id,
        doctorId: doctor.id,
        startTime: pastStartTime2,
        endTime: pastEndTime2,
        status: AppointmentStatus.COMPLETED,
      });

      // Run archive job
      const archivedCount = await archiveExpiredAppointments();

      expect(archivedCount).toBe(2);

      // Verify both appointments are archived
      const appointments = await db.query((prisma) =>
        prisma.appointment.findMany({
          where: {
            id: { in: [appointment1.id, appointment2.id] },
          },
          select: { id: true, isArchived: true },
        })
      );

      expect(appointments).toHaveLength(2);
      expect(appointments.every((apt) => apt.isArchived)).toBe(true);
    });

    it("should only archive expired appointments, not future ones", async () => {
      const now = new Date();
      const pastEndTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const pastStartTime = new Date(pastEndTime.getTime() - 30 * 60 * 1000);
      const futureEndTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const futureStartTime = new Date(now.getTime() + 30 * 60 * 1000);

      // Create patients and doctor
      const patient1 = await createTestUser({ role: "PATIENT" });
      const patient2 = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      // Create one expired and one future appointment
      const expiredAppointment = await createTestAppointment({
        patientId: patient1.id,
        doctorId: doctor.id,
        startTime: pastStartTime,
        endTime: pastEndTime,
        status: AppointmentStatus.COMPLETED,
      });

      const futureAppointment = await createTestAppointment({
        patientId: patient2.id,
        doctorId: doctor.id,
        startTime: futureStartTime,
        endTime: futureEndTime,
        status: AppointmentStatus.CONFIRMED,
      });

      // Run archive job
      const archivedCount = await archiveExpiredAppointments();

      expect(archivedCount).toBe(1);

      // Verify only expired appointment is archived
      const expired = await db.query((prisma) =>
        prisma.appointment.findUnique({
          where: { id: expiredAppointment.id },
          select: { isArchived: true },
        })
      );

      const future = await db.query((prisma) =>
        prisma.appointment.findUnique({
          where: { id: futureAppointment.id },
          select: { isArchived: true },
        })
      );

      expect(expired?.isArchived).toBe(true);
      expect(future?.isArchived).toBe(false);
    });

    it("should return 0 if no expired appointments exist", async () => {
      const now = new Date();
      const futureEndTime = new Date(now.getTime() + 60 * 60 * 1000);
      const futureStartTime = new Date(now.getTime() + 30 * 60 * 1000);

      // Create patient and doctor
      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      // Create only future appointment
      await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: futureStartTime,
        endTime: futureEndTime,
        status: AppointmentStatus.CONFIRMED,
      });

      // Run archive job
      const archivedCount = await archiveExpiredAppointments();

      expect(archivedCount).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      // Mock query to throw an error
      vi.spyOn(db, "query").mockImplementationOnce(() => {
        throw new Error("Database connection failed");
      });

      // Should throw error (not catch it internally)
      await expect(archiveExpiredAppointments()).rejects.toThrow(
        "Database connection failed"
      );

      // Restore original query
      vi.restoreAllMocks();
    });
  });
});
