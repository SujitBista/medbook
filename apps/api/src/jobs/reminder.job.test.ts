/**
 * Integration tests for reminder job
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { processReminders } from "./reminder.job";
import {
  cleanupTestData,
  createTestUser,
  createTestDoctor,
  createTestAppointment,
} from "../__tests__/db";
import { query } from "@app/db";
import { AppointmentStatus } from "@medbook/types";
import { sendAppointmentReminderEmail } from "../services/email.service";

// Mock email service
vi.mock("../services/email.service", () => ({
  sendAppointmentReminderEmail: vi.fn(),
}));

// Mock logger
vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("reminder.job", () => {
  beforeEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("processReminders", () => {
    it("should process due reminders and send emails", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const appointmentTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

      // Create patient and doctor
      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      // Create appointment
      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      // Create reminder scheduled in the past (due)
      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      // Mock email service to return success
      vi.mocked(sendAppointmentReminderEmail).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      });

      const processedCount = await processReminders();

      expect(processedCount).toBe(1);
      expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(1);
      expect(sendAppointmentReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          patientEmail: patient.email,
          appointmentId: appointment.id,
        })
      );

      // Verify reminder is marked as sent
      const reminder = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { appointmentId: appointment.id },
        })
      );

      expect(reminder?.sentAt).toBeDefined();
    });

    it("should skip reminders for cancelled appointments", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);
      const appointmentTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
        status: AppointmentStatus.CANCELLED,
      });

      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      const processedCount = await processReminders();

      expect(processedCount).toBe(1); // Processed but skipped
      expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();

      // Verify reminder is cancelled, not sent
      const reminder = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { appointmentId: appointment.id },
        })
      );

      expect(reminder?.cancelledAt).toBeDefined();
      expect(reminder?.sentAt).toBeNull();
    });

    it("should skip reminders for completed appointments", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);
      const appointmentTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
      });

      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      const processedCount = await processReminders();

      expect(processedCount).toBe(1);
      expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();

      // Verify reminder is cancelled
      const reminder = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { appointmentId: appointment.id },
        })
      );

      expect(reminder?.cancelledAt).toBeDefined();
    });

    it("should handle email sending failures gracefully", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);
      const appointmentTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      // Mock email service to return failure
      vi.mocked(sendAppointmentReminderEmail).mockResolvedValue({
        success: false,
        error: "Email service unavailable",
      });

      const processedCount = await processReminders();

      expect(processedCount).toBe(1);
      expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(1);

      // Verify reminder is NOT marked as sent (will retry on next run)
      const reminder = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { appointmentId: appointment.id },
        })
      );

      expect(reminder?.sentAt).toBeNull();
      expect(reminder?.cancelledAt).toBeNull();
    });

    it("should handle missing appointments gracefully", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);

      // Create reminder for non-existent appointment
      const reminder = await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: "non-existent-appointment-id",
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      const processedCount = await processReminders();

      expect(processedCount).toBe(1);
      expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();

      // Verify reminder is marked as sent (to avoid retrying)
      const updated = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { id: reminder.id },
        })
      );

      expect(updated?.sentAt).toBeDefined();
    });

    it("should process multiple reminders", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);
      const appointmentTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const patient1 = await createTestUser({ role: "PATIENT" });
      const patient2 = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      const appointment1 = await createTestAppointment({
        patientId: patient1.id,
        doctorId: doctor.id,
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      const appointment2 = await createTestAppointment({
        patientId: patient2.id,
        doctorId: doctor.id,
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment1.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment2.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      vi.mocked(sendAppointmentReminderEmail).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      });

      const processedCount = await processReminders();

      expect(processedCount).toBe(2);
      expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(2);
    });

    it("should calculate hoursUntil correctly", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const appointmentTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestDoctor();

      const appointment = await createTestAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      vi.mocked(sendAppointmentReminderEmail).mockResolvedValue({
        success: true,
        messageId: "test-message-id",
      });

      await processReminders();

      // Verify hoursUntil was calculated correctly (should be ~3 hours)
      expect(sendAppointmentReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          hoursUntil: expect.any(Number),
        })
      );

      const callArgs = vi.mocked(sendAppointmentReminderEmail).mock.calls[0][0];
      expect(callArgs.hoursUntil).toBeGreaterThan(2);
      expect(callArgs.hoursUntil).toBeLessThan(4);
    });

    it("should return 0 if no reminders are due", async () => {
      const processedCount = await processReminders();

      expect(processedCount).toBe(0);
      expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    });
  });
});
