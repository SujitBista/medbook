/**
 * Unit tests for exception service helpers and validation
 */

import { describe, it, expect, vi } from "vitest";
import { countDaysInclusive, validateTimeRange } from "./exception.service";
import { createScheduleException } from "./exception.service";
import { ScheduleExceptionType } from "@medbook/types";
import { createTestUser, cleanupTestData } from "../__tests__/db";

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("exception.service", () => {
  describe("countDaysInclusive", () => {
    it("returns 1 for same date", () => {
      expect(countDaysInclusive("2025-02-10", "2025-02-10")).toBe(1);
    });

    it("returns correct count for date range", () => {
      expect(countDaysInclusive("2025-02-10", "2025-02-12")).toBe(3);
      expect(countDaysInclusive("2025-01-01", "2025-01-31")).toBe(31);
    });

    it("returns 0 when dateTo is before dateFrom", () => {
      expect(countDaysInclusive("2025-02-12", "2025-02-10")).toBe(0);
    });

    it("returns 0 for invalid dates", () => {
      expect(countDaysInclusive("", "2025-02-10")).toBe(0);
      expect(countDaysInclusive("2025-02-10", "")).toBe(0);
    });
  });

  describe("validateTimeRange", () => {
    it("does not throw when endTime is after startTime", () => {
      expect(() => validateTimeRange("09:00", "17:00")).not.toThrow();
      expect(() => validateTimeRange("00:00", "23:59")).not.toThrow();
    });

    it("throws when endTime equals startTime", () => {
      expect(() => validateTimeRange("09:00", "09:00")).toThrow(
        "End time must be after start time"
      );
    });

    it("throws when endTime is before startTime", () => {
      expect(() => validateTimeRange("17:00", "09:00")).toThrow(
        "End time must be after start time"
      );
    });

    it("does not throw when either is null/undefined", () => {
      expect(() => validateTimeRange(null, "17:00")).not.toThrow();
      expect(() => validateTimeRange("09:00", null)).not.toThrow();
      expect(() => validateTimeRange(undefined, undefined)).not.toThrow();
    });
  });

  describe("createScheduleException", () => {
    beforeEach(async () => {
      await cleanupTestData();
    });

    it("rejects EXTRA_HOURS with endTime before startTime", async () => {
      const user = await createTestUser({
        email: "admin@test.com",
        role: "ADMIN",
      });
      await expect(
        createScheduleException(
          {
            scope: "ALL_DOCTORS",
            dateFrom: "2025-03-01",
            type: ScheduleExceptionType.AVAILABLE,
            reason: "EXTRA_HOURS",
            startTime: "18:00",
            endTime: "17:00",
          },
          user.id
        )
      ).rejects.toThrow("End time must be after start time");
    });

    it("rejects dateTo before dateFrom", async () => {
      const user = await createTestUser({
        email: "admin2@test.com",
        role: "ADMIN",
      });
      await expect(
        createScheduleException(
          {
            scope: "ALL_DOCTORS",
            dateFrom: "2025-03-05",
            dateTo: "2025-03-01",
            type: ScheduleExceptionType.UNAVAILABLE,
            reason: "HOLIDAY",
            isFullDay: true,
          },
          user.id
        )
      ).rejects.toThrow("End date must be on or after start date");
    });
  });
});
