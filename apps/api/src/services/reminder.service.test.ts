/**
 * Unit tests for reminder service
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createReminder,
  cancelReminder,
  updateReminderForReschedule,
  getDueReminders,
  markReminderAsSent,
} from "./reminder.service";
import { cleanupTestData, createTestAppointment } from "../__tests__/db";
import { ReminderType } from "@medbook/types";
import { query } from "@app/db";

describe("reminder.service", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("createReminder", () => {
    it("should create a reminder for an appointment 24 hours before", async () => {
      // Create appointment 25 hours from now
      const appointmentTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      const reminder = await createReminder(
        appointment.id,
        appointment.startTime
      );

      expect(reminder).toBeDefined();
      expect(reminder.appointmentId).toBe(appointment.id);
      expect(reminder.reminderType).toBe(ReminderType.TWENTY_FOUR_HOUR);

      // Verify scheduled time is 24 hours before appointment
      const expectedScheduledTime = new Date(
        appointmentTime.getTime() - 24 * 60 * 60 * 1000
      );
      expect(reminder.scheduledFor.getTime()).toBeCloseTo(
        expectedScheduledTime.getTime(),
        -3 // Allow 1 second difference
      );
    });

    it("should create a reminder with ONE_HOUR type", async () => {
      const appointmentTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      const reminder = await createReminder(
        appointment.id,
        appointment.startTime,
        ReminderType.ONE_HOUR
      );

      expect(reminder.reminderType).toBe(ReminderType.ONE_HOUR);

      // Verify scheduled time is 1 hour before appointment
      const expectedScheduledTime = new Date(
        appointmentTime.getTime() - 60 * 60 * 1000
      );
      expect(reminder.scheduledFor.getTime()).toBeCloseTo(
        expectedScheduledTime.getTime(),
        -3
      );
    });

    it("should throw error if appointment is too soon (reminder would be in the past)", async () => {
      // Create appointment 1 hour from now (too soon for 24-hour reminder)
      const appointmentTime = new Date(Date.now() + 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      await expect(
        createReminder(appointment.id, appointment.startTime)
      ).rejects.toThrow("Cannot schedule reminder in the past");
    });

    it("should allow ONE_HOUR reminder for appointment 2 hours away", async () => {
      const appointmentTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      const reminder = await createReminder(
        appointment.id,
        appointment.startTime,
        ReminderType.ONE_HOUR
      );

      expect(reminder).toBeDefined();
      expect(reminder.reminderType).toBe(ReminderType.ONE_HOUR);
    });
  });

  describe("cancelReminder", () => {
    it("should cancel an existing reminder", async () => {
      const appointmentTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      // Create reminder first
      await createReminder(appointment.id, appointment.startTime);

      // Cancel it
      const result = await cancelReminder(appointment.id);

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
      expect(result?.cancelledAt).toBeDefined();

      // Verify reminder is cancelled in database
      const reminder = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { appointmentId: appointment.id },
        })
      );

      expect(reminder?.cancelledAt).toBeDefined();
    });

    it("should return null if reminder does not exist", async () => {
      const appointment = await createTestAppointment({
        startTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000 + 30 * 60 * 1000),
      });

      const result = await cancelReminder(appointment.id);

      expect(result).toBeNull();
    });

    it("should return null if reminder is already sent", async () => {
      const appointmentTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      // Create and mark as sent
      const reminder = await createReminder(
        appointment.id,
        appointment.startTime
      );
      await markReminderAsSent(reminder.id);

      // Try to cancel
      const result = await cancelReminder(appointment.id);

      expect(result).toBeNull();
    });

    it("should return null if reminder is already cancelled", async () => {
      const appointmentTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      // Create and cancel
      await createReminder(appointment.id, appointment.startTime);
      await cancelReminder(appointment.id);

      // Try to cancel again
      const result = await cancelReminder(appointment.id);

      expect(result).toBeNull();
    });
  });

  describe("updateReminderForReschedule", () => {
    it("should update reminder when appointment is rescheduled", async () => {
      const originalTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: originalTime,
        endTime: new Date(originalTime.getTime() + 30 * 60 * 1000),
      });

      // Create original reminder
      await createReminder(appointment.id, originalTime);

      // Reschedule to 30 hours from now
      const newTime = new Date(Date.now() + 30 * 60 * 60 * 1000);
      const updated = await updateReminderForReschedule(
        appointment.id,
        newTime
      );

      expect(updated).toBeDefined();
      expect(updated?.appointmentId).toBe(appointment.id);

      // Verify new scheduled time is 24 hours before new appointment time
      const expectedScheduledTime = new Date(
        newTime.getTime() - 24 * 60 * 60 * 1000
      );
      expect(updated?.scheduledFor.getTime()).toBeCloseTo(
        expectedScheduledTime.getTime(),
        -3
      );
    });

    it("should create new reminder if none exists", async () => {
      const appointment = await createTestAppointment({
        startTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000 + 30 * 60 * 1000),
      });

      const newTime = new Date(Date.now() + 30 * 60 * 60 * 1000);
      const updated = await updateReminderForReschedule(
        appointment.id,
        newTime
      );

      expect(updated).toBeDefined();
      expect(updated?.appointmentId).toBe(appointment.id);
    });

    it("should create new reminder if old one was already sent", async () => {
      const originalTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: originalTime,
        endTime: new Date(originalTime.getTime() + 30 * 60 * 1000),
      });

      // Create and send reminder
      const reminder = await createReminder(appointment.id, originalTime);
      await markReminderAsSent(reminder.id);

      // Reschedule
      const newTime = new Date(Date.now() + 30 * 60 * 60 * 1000);
      const updated = await updateReminderForReschedule(
        appointment.id,
        newTime
      );

      expect(updated).toBeDefined();
      expect(updated?.id).not.toBe(reminder.id); // Should be a new reminder
    });

    it("should cancel reminder if new appointment time is too soon", async () => {
      const originalTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: originalTime,
        endTime: new Date(originalTime.getTime() + 30 * 60 * 1000),
      });

      // Create reminder
      await createReminder(appointment.id, originalTime);

      // Reschedule to 1 hour from now (too soon for 24-hour reminder)
      const newTime = new Date(Date.now() + 60 * 60 * 1000);
      const updated = await updateReminderForReschedule(
        appointment.id,
        newTime
      );

      expect(updated).toBeNull();

      // Verify old reminder is cancelled
      const reminder = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { appointmentId: appointment.id },
        })
      );

      expect(reminder?.cancelledAt).toBeDefined();
    });
  });

  describe("getDueReminders", () => {
    it("should get reminders that are due to be sent", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const futureTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      // Create appointment with reminder scheduled in the past
      const appointment1 = await createTestAppointment({
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 30 * 60 * 1000),
      });

      // Manually create reminder scheduled in the past
      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment1.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      // Create appointment with reminder scheduled in the future (not due)
      const appointment2 = await createTestAppointment({
        startTime: new Date(now.getTime() + 25 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 25 * 60 * 60 * 1000 + 30 * 60 * 1000),
      });
      await createReminder(appointment2.id, appointment2.startTime);

      const dueReminders = await getDueReminders();

      expect(dueReminders.length).toBe(1);
      expect(dueReminders[0].appointmentId).toBe(appointment1.id);
    });

    it("should not return reminders that are already sent", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);

      const appointment = await createTestAppointment({
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 60 * 60 * 1000 + 30 * 60 * 1000),
      });

      // Create and mark as sent
      const reminder = await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
            sentAt: new Date(),
          },
        })
      );

      const dueReminders = await getDueReminders();

      expect(dueReminders.length).toBe(0);
    });

    it("should not return reminders that are cancelled", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);

      const appointment = await createTestAppointment({
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 60 * 60 * 1000 + 30 * 60 * 1000),
      });

      // Create and cancel
      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: pastTime,
            reminderType: "TWENTY_FOUR_HOUR",
            cancelledAt: new Date(),
          },
        })
      );

      const dueReminders = await getDueReminders();

      expect(dueReminders.length).toBe(0);
    });

    it("should return reminders ordered by scheduledFor", async () => {
      const now = new Date();

      // Create multiple reminders with different scheduled times
      const appointment1 = await createTestAppointment({
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 60 * 60 * 1000 + 30 * 60 * 1000),
      });
      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment1.id,
            scheduledFor: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      const appointment2 = await createTestAppointment({
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 60 * 60 * 1000 + 30 * 60 * 1000),
      });
      await query((prisma) =>
        prisma.reminder.create({
          data: {
            appointmentId: appointment2.id,
            scheduledFor: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
            reminderType: "TWENTY_FOUR_HOUR",
          },
        })
      );

      const dueReminders = await getDueReminders();

      expect(dueReminders.length).toBe(2);
      // Should be ordered by scheduledFor (ascending - oldest first)
      expect(dueReminders[0].scheduledFor.getTime()).toBeLessThan(
        dueReminders[1].scheduledFor.getTime()
      );
    });
  });

  describe("markReminderAsSent", () => {
    it("should mark reminder as sent", async () => {
      const appointmentTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      const reminder = await createReminder(
        appointment.id,
        appointment.startTime
      );
      const result = await markReminderAsSent(reminder.id);

      expect(result.sentAt).toBeDefined();

      // Verify in database
      const updated = await query((prisma) =>
        prisma.reminder.findUnique({
          where: { id: reminder.id },
        })
      );

      expect(updated?.sentAt).toBeDefined();
    });

    it("should return existing sentAt if already sent", async () => {
      const appointmentTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        startTime: appointmentTime,
        endTime: new Date(appointmentTime.getTime() + 30 * 60 * 1000),
      });

      const reminder = await createReminder(
        appointment.id,
        appointment.startTime
      );
      const firstSent = await markReminderAsSent(reminder.id);
      const secondSent = await markReminderAsSent(reminder.id);

      expect(firstSent.sentAt).toBeDefined();
      expect(secondSent.sentAt).toBeDefined();
      expect(firstSent.sentAt?.getTime()).toBe(secondSent.sentAt?.getTime());
    });

    it("should throw error if reminder not found", async () => {
      await expect(markReminderAsSent("non-existent-id")).rejects.toThrow(
        "Reminder not found"
      );
    });
  });
});
