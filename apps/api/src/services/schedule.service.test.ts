/**
 * Schedule service tests (capacity-based)
 * - Overlap rejection only for same doctor on same date
 * - Same time window allowed for different doctors
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createSchedule, getAvailabilityWindows } from "./schedule.service";
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

  it("should return availability windows with confirmedCount and remaining", async () => {
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
  });
});
