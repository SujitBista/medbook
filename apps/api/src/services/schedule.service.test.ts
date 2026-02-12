/**
 * Schedule service tests (capacity-based)
 * - Overlap rejection only for same doctor on same date
 * - Same time window allowed for different doctors
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAvailabilityWindows,
} from "./schedule.service";
import {
  createTestDoctor,
  createTestUser,
  cleanupTestData,
} from "../__tests__/db";

describe("schedule.service", () => {
  let doctorAId: string;
  let doctorBId: string;
  const date = "2026-02-15";

  beforeEach(async () => {
    await cleanupTestData();
    const doctorA = await createTestDoctor();
    const doctorB = await createTestDoctor();
    doctorAId = doctorA.id;
    doctorBId = doctorB.id;
  });

  it("should reject exact duplicate schedule (same doctor, date, startTime, endTime) with 409", async () => {
    await createSchedule({
      doctorId: doctorAId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 10,
    });

    await expect(
      createSchedule({
        doctorId: doctorAId,
        date,
        startTime: "09:00",
        endTime: "12:00",
        maxPatients: 15,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("already exists"),
    });
  });

  it("should reject overlapping schedule for same doctor on same date", async () => {
    await createSchedule({
      doctorId: doctorAId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 10,
    });

    await expect(
      createSchedule({
        doctorId: doctorAId,
        date,
        startTime: "11:00",
        endTime: "14:00",
        maxPatients: 10,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("overlaps"),
    });
  });

  it("should reject schedule when end date/time is in the past", async () => {
    const pastDate = "2020-01-01";
    await expect(
      createSchedule({
        doctorId: doctorAId,
        date: pastDate,
        startTime: "09:00",
        endTime: "12:00",
        maxPatients: 10,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("past"),
    });
  });

  it("should allow same time window for different doctors", async () => {
    const s1 = await createSchedule({
      doctorId: doctorAId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 10,
    });
    const s2 = await createSchedule({
      doctorId: doctorBId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 15,
    });

    expect(s1.id).toBeDefined();
    expect(s2.id).toBeDefined();
    expect(s1.doctorId).toBe(doctorAId);
    expect(s2.doctorId).toBe(doctorBId);
  });

  it("should update schedule and reject past date on update", async () => {
    const s = await createSchedule({
      doctorId: doctorAId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 10,
    });
    const updated = await updateSchedule(s.id, {
      date: "2026-02-16",
      startTime: "10:00",
      endTime: "14:00",
      maxPatients: 20,
    });
    expect(updated.id).toBe(s.id);
    expect(updated.startTime).toBe("10:00");
    expect(updated.endTime).toBe("14:00");
    expect(updated.maxPatients).toBe(20);

    await expect(
      updateSchedule(s.id, {
        date: "2020-01-01",
        startTime: "09:00",
        endTime: "12:00",
        maxPatients: 10,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("past"),
    });
  });

  it("should delete schedule", async () => {
    const s = await createSchedule({
      doctorId: doctorAId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 10,
    });
    await deleteSchedule(s.id);
    const windows = await getAvailabilityWindows(doctorAId, date);
    expect(windows).toHaveLength(0);
  });

  it("should return availability windows with confirmedCount, remaining, isBookable, disabledReason", async () => {
    await createSchedule({
      doctorId: doctorAId,
      date,
      startTime: "09:00",
      endTime: "12:00",
      maxPatients: 5,
    });

    const windows = await getAvailabilityWindows(doctorAId, date);
    expect(windows).toHaveLength(1);
    expect(windows[0].startTime).toBe("09:00");
    expect(windows[0].endTime).toBe("12:00");
    expect(windows[0].maxPatients).toBe(5);
    expect(windows[0].confirmedCount).toBe(0);
    expect(windows[0].remaining).toBe(5);
    expect(typeof windows[0].isBookable).toBe("boolean");
    expect(typeof windows[0].disabledReason).toBe("string");
    expect(
      windows[0].disabledReasonCode === undefined ||
        ["FULL", "PAST", "PAYMENT_NOT_CONFIGURED", "ROLE_FORBIDDEN"].includes(
          windows[0].disabledReasonCode!
        )
    ).toBe(true);
  });
});
