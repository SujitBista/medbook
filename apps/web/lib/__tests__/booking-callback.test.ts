/**
 * Unit tests for booking callback URL utilities.
 * Verifies that we correctly build and parse callbackUrl for post-login redirect
 * to the appointment confirm step.
 */

import { describe, it, expect } from "vitest";
import {
  buildBookingConfirmCallbackUrl,
  parseBookingConfirmParams,
  BOOKING_CONFIRM_PARAMS,
} from "../booking-callback";

describe("booking-callback", () => {
  const slot = {
    id: "slot-abc",
    availabilityId: "avail-xyz",
    startTime: new Date("2025-01-20T14:00:00Z"),
    endTime: new Date("2025-01-20T14:30:00Z"),
  };

  describe("buildBookingConfirmCallbackUrl", () => {
    it("builds URL with doctorId and slot params", () => {
      const url = buildBookingConfirmCallbackUrl("doc-1", slot);
      expect(url).toMatch(/^\/doctors\/doc-1\?/);
      expect(url).toContain(`${BOOKING_CONFIRM_PARAMS.SLOT_ID}=slot-abc`);
      expect(url).toContain(
        `${BOOKING_CONFIRM_PARAMS.AVAILABILITY_ID}=avail-xyz`
      );
      expect(url).toContain(BOOKING_CONFIRM_PARAMS.START_TIME);
      expect(url).toContain(BOOKING_CONFIRM_PARAMS.END_TIME);
      expect(url).toContain(`${BOOKING_CONFIRM_PARAMS.CONFIRM}=1`);
      const params = new URLSearchParams(url.split("?")[1] ?? "");
      expect(params.get(BOOKING_CONFIRM_PARAMS.START_TIME)).toBe(
        slot.startTime.toISOString()
      );
      expect(params.get(BOOKING_CONFIRM_PARAMS.END_TIME)).toBe(
        slot.endTime.toISOString()
      );
    });
  });

  describe("parseBookingConfirmParams", () => {
    it("parses valid params and returns slot data", () => {
      const url = buildBookingConfirmCallbackUrl("doc-1", slot);
      const path = url.split("?")[1] ?? "";
      const params = new URLSearchParams(path);
      const parsed = parseBookingConfirmParams(params);
      expect(parsed).not.toBeNull();
      expect(parsed!.slotId).toBe("slot-abc");
      expect(parsed!.availabilityId).toBe("avail-xyz");
      expect(parsed!.startTime.getTime()).toBe(slot.startTime.getTime());
      expect(parsed!.endTime.getTime()).toBe(slot.endTime.getTime());
    });

    it("returns null when confirm is not 1", () => {
      const params = new URLSearchParams();
      params.set(BOOKING_CONFIRM_PARAMS.SLOT_ID, "s1");
      params.set(BOOKING_CONFIRM_PARAMS.AVAILABILITY_ID, "a1");
      params.set(BOOKING_CONFIRM_PARAMS.START_TIME, "2025-01-20T14:00:00.000Z");
      params.set(BOOKING_CONFIRM_PARAMS.END_TIME, "2025-01-20T14:30:00.000Z");
      params.set(BOOKING_CONFIRM_PARAMS.CONFIRM, "0");
      expect(parseBookingConfirmParams(params)).toBeNull();
    });

    it("returns null when slotId is missing", () => {
      const params = new URLSearchParams();
      params.set(BOOKING_CONFIRM_PARAMS.AVAILABILITY_ID, "a1");
      params.set(BOOKING_CONFIRM_PARAMS.START_TIME, "2025-01-20T14:00:00.000Z");
      params.set(BOOKING_CONFIRM_PARAMS.END_TIME, "2025-01-20T14:30:00.000Z");
      params.set(BOOKING_CONFIRM_PARAMS.CONFIRM, "1");
      expect(parseBookingConfirmParams(params)).toBeNull();
    });

    it("returns null when startTime is invalid", () => {
      const params = new URLSearchParams();
      params.set(BOOKING_CONFIRM_PARAMS.SLOT_ID, "s1");
      params.set(BOOKING_CONFIRM_PARAMS.AVAILABILITY_ID, "a1");
      params.set(BOOKING_CONFIRM_PARAMS.START_TIME, "not-a-date");
      params.set(BOOKING_CONFIRM_PARAMS.END_TIME, "2025-01-20T14:30:00.000Z");
      params.set(BOOKING_CONFIRM_PARAMS.CONFIRM, "1");
      expect(parseBookingConfirmParams(params)).toBeNull();
    });
  });

  describe("round-trip", () => {
    it("build -> parse round-trip preserves slot data", () => {
      const url = buildBookingConfirmCallbackUrl("doc-99", slot);
      const qs = url.split("?")[1];
      const params = new URLSearchParams(qs ?? "");
      const parsed = parseBookingConfirmParams(params);
      expect(parsed).not.toBeNull();
      expect(parsed!.slotId).toBe(slot.id);
      expect(parsed!.availabilityId).toBe(slot.availabilityId);
      expect(parsed!.startTime.toISOString()).toBe(
        slot.startTime.toISOString()
      );
      expect(parsed!.endTime.toISOString()).toBe(slot.endTime.toISOString());
    });
  });
});
