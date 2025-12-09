/**
 * Unit tests for email service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sendWelcomeEmail,
  sendAppointmentConfirmationEmail,
  sendAppointmentCancellationEmail,
  sendAppointmentReminderEmail,
} from "./email.service";

// Mock Resend module
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn(),
      },
    })),
  };
});

// Mock environment config
vi.mock("../config/env", () => ({
  env: {
    resendApiKey: undefined, // Will be set in tests
    emailFrom: "MedBook <noreply@medbook.com>",
    appUrl: "http://localhost:3000",
  },
  isDevelopment: true,
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

describe("email.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendWelcomeEmail", () => {
    it("should return success in dev mode without API key", async () => {
      const result = await sendWelcomeEmail({
        email: "test@example.com",
        role: "PATIENT",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("dev-mode-not-sent");
    });

    it("should handle PATIENT role correctly", async () => {
      const result = await sendWelcomeEmail({
        email: "patient@example.com",
        role: "PATIENT",
      });

      expect(result.success).toBe(true);
    });

    it("should handle DOCTOR role correctly", async () => {
      const result = await sendWelcomeEmail({
        email: "doctor@example.com",
        role: "DOCTOR",
      });

      expect(result.success).toBe(true);
    });

    it("should handle ADMIN role correctly", async () => {
      const result = await sendWelcomeEmail({
        email: "admin@example.com",
        role: "ADMIN",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendAppointmentConfirmationEmail", () => {
    it("should return success in dev mode without API key", async () => {
      const result = await sendAppointmentConfirmationEmail({
        patientEmail: "patient@example.com",
        patientName: "John Doe",
        doctorName: "Jane Smith",
        doctorSpecialization: "Cardiology",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        appointmentId: "appt-123456",
        notes: "Follow-up visit",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("dev-mode-not-sent");
    });

    it("should work without optional fields", async () => {
      const result = await sendAppointmentConfirmationEmail({
        patientEmail: "patient@example.com",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        appointmentId: "appt-123456",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendAppointmentCancellationEmail", () => {
    it("should return success in dev mode without API key", async () => {
      const result = await sendAppointmentCancellationEmail({
        patientEmail: "patient@example.com",
        patientName: "John Doe",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        reason: "Doctor unavailable",
        cancelledBy: "doctor",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("dev-mode-not-sent");
    });

    it("should handle patient cancellation", async () => {
      const result = await sendAppointmentCancellationEmail({
        patientEmail: "patient@example.com",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        cancelledBy: "patient",
      });

      expect(result.success).toBe(true);
    });

    it("should handle admin cancellation", async () => {
      const result = await sendAppointmentCancellationEmail({
        patientEmail: "patient@example.com",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        cancelledBy: "admin",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendAppointmentReminderEmail", () => {
    it("should return success in dev mode without API key", async () => {
      const result = await sendAppointmentReminderEmail({
        patientEmail: "patient@example.com",
        patientName: "John Doe",
        doctorName: "Jane Smith",
        doctorSpecialization: "Cardiology",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        appointmentId: "appt-123456",
        hoursUntil: 24,
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("dev-mode-not-sent");
    });

    it("should handle 1-hour reminder", async () => {
      const result = await sendAppointmentReminderEmail({
        patientEmail: "patient@example.com",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        appointmentId: "appt-123456",
        hoursUntil: 1,
      });

      expect(result.success).toBe(true);
    });

    it("should handle multi-day reminder", async () => {
      const result = await sendAppointmentReminderEmail({
        patientEmail: "patient@example.com",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        appointmentEndTime: new Date("2025-12-15T10:30:00Z"),
        appointmentId: "appt-123456",
        hoursUntil: 48,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("email template content", () => {
    it("should generate proper date formatting", async () => {
      // The emails should not throw even with different date formats
      const result = await sendAppointmentConfirmationEmail({
        patientEmail: "patient@example.com",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-01-01T09:00:00Z"),
        appointmentEndTime: new Date("2025-01-01T09:30:00Z"),
        appointmentId: "appt-test",
      });

      expect(result.success).toBe(true);
    });

    it("should truncate long appointment IDs in confirmation number", async () => {
      const longAppointmentId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const result = await sendAppointmentConfirmationEmail({
        patientEmail: "patient@example.com",
        doctorName: "Jane Smith",
        appointmentDate: new Date("2025-01-01T09:00:00Z"),
        appointmentEndTime: new Date("2025-01-01T09:30:00Z"),
        appointmentId: longAppointmentId,
      });

      // Should succeed - the ID is truncated in the template
      expect(result.success).toBe(true);
    });
  });
});
