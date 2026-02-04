/**
 * Tests for schedule exception application to slot generation
 */

import { describe, it, expect, vi } from "vitest";
import { slotBlockedByException } from "./slot.service";
import type { ScheduleException } from "@medbook/types";

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("slot exception application", () => {
  const doctorId = "doctor-1";

  describe("slotBlockedByException", () => {
    it("full-day holiday blocks slot on that date", () => {
      const ex: ScheduleException = {
        id: "ex-1",
        doctorId,
        dateFrom: new Date("2025-02-10T00:00:00"),
        dateTo: new Date("2025-02-10T23:59:59"),
        startTime: null,
        endTime: null,
        type: "UNAVAILABLE",
        reason: "HOLIDAY",
        label: null,
        createdById: "user-1",
        createdAt: new Date(),
      };
      const slot = {
        startTime: new Date("2025-02-10T09:00:00"),
        endTime: new Date("2025-02-10T09:30:00"),
      };
      expect(slotBlockedByException(slot, ex, doctorId)).toBe(true);
    });

    it("full-day holiday does not block slot on another date", () => {
      const ex: ScheduleException = {
        id: "ex-1",
        doctorId,
        dateFrom: new Date("2025-02-10T00:00:00"),
        dateTo: new Date("2025-02-10T23:59:59"),
        startTime: null,
        endTime: null,
        type: "UNAVAILABLE",
        reason: "HOLIDAY",
        label: null,
        createdById: "user-1",
        createdAt: new Date(),
      };
      const slot = {
        startTime: new Date("2025-02-11T09:00:00"),
        endTime: new Date("2025-02-11T09:30:00"),
      };
      expect(slotBlockedByException(slot, ex, doctorId)).toBe(false);
    });

    it("partial closure blocks overlapping slot", () => {
      const ex: ScheduleException = {
        id: "ex-1",
        doctorId,
        dateFrom: new Date("2025-02-10T00:00:00"),
        dateTo: new Date("2025-02-10T23:59:59"),
        startTime: "10:00",
        endTime: "12:00",
        type: "UNAVAILABLE",
        reason: "HOLIDAY",
        label: null,
        createdById: "user-1",
        createdAt: new Date(),
      };
      const slot = {
        startTime: new Date("2025-02-10T10:30:00"),
        endTime: new Date("2025-02-10T11:00:00"),
      };
      expect(slotBlockedByException(slot, ex, doctorId)).toBe(true);
    });

    it("partial closure does not block non-overlapping slot", () => {
      const ex: ScheduleException = {
        id: "ex-1",
        doctorId,
        dateFrom: new Date("2025-02-10T00:00:00"),
        dateTo: new Date("2025-02-10T23:59:59"),
        startTime: "10:00",
        endTime: "12:00",
        type: "UNAVAILABLE",
        reason: "HOLIDAY",
        label: null,
        createdById: "user-1",
        createdAt: new Date(),
      };
      const slot = {
        startTime: new Date("2025-02-10T14:00:00"),
        endTime: new Date("2025-02-10T14:30:00"),
      };
      expect(slotBlockedByException(slot, ex, doctorId)).toBe(false);
    });

    it("returns false when exception is for another doctor", () => {
      const ex: ScheduleException = {
        id: "ex-1",
        doctorId: "other-doctor",
        dateFrom: new Date("2025-02-10T00:00:00"),
        dateTo: new Date("2025-02-10T23:59:59"),
        startTime: null,
        endTime: null,
        type: "UNAVAILABLE",
        reason: "HOLIDAY",
        label: null,
        createdById: "user-1",
        createdAt: new Date(),
      };
      const slot = {
        startTime: new Date("2025-02-10T09:00:00"),
        endTime: new Date("2025-02-10T09:30:00"),
      };
      expect(slotBlockedByException(slot, ex, doctorId)).toBe(false);
    });
  });
});
