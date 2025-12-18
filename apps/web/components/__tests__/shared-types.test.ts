import { describe, it, expect } from "vitest";
import {
  UserRole,
  AppointmentStatus,
  CANCELLATION_RULES,
} from "@medbook/types";

describe("Shared types from @medbook/types", () => {
  it("UserRole enum contains expected roles", () => {
    expect(UserRole.PATIENT).toBe("PATIENT");
    expect(UserRole.DOCTOR).toBe("DOCTOR");
    expect(UserRole.ADMIN).toBe("ADMIN");
  });

  it("AppointmentStatus enum contains expected statuses", () => {
    expect(AppointmentStatus.PENDING).toBe("PENDING");
    expect(AppointmentStatus.CONFIRMED).toBe("CONFIRMED");
    expect(AppointmentStatus.CANCELLED).toBe("CANCELLED");
    expect(AppointmentStatus.COMPLETED).toBe("COMPLETED");
  });

  it("CANCELLATION_RULES uses the configured defaults", () => {
    expect(CANCELLATION_RULES.PATIENT_MIN_HOURS_BEFORE).toBe(24);
    expect(CANCELLATION_RULES.DOCTOR_CAN_CANCEL_ANYTIME).toBe(true);
    expect(CANCELLATION_RULES.ADMIN_CAN_CANCEL_ANYTIME).toBe(true);
  });
});
