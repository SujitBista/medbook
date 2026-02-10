/**
 * Integration tests for booking routes
 * POST /api/v1/bookings/start - rejects missing scheduleId (400), requires auth (401)
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  createTestApp,
  createTestAgent,
  createAuthHeaders,
} from "../__tests__/helpers";
import { cleanupTestData, createTestUser } from "../__tests__/db";
import { UserRole } from "@medbook/types";

const TEST_ORIGIN = "http://localhost:3000";

describe("POST /api/v1/bookings/start", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should return 401 when not authenticated", async () => {
    const response = await agent
      .post("/api/v1/bookings/start")
      .set("Origin", TEST_ORIGIN)
      .set("Content-Type", "application/json")
      .send({ scheduleId: "some-schedule-id" })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should return 400 when scheduleId is missing", async () => {
    const patient = await createTestUser({ role: UserRole.PATIENT });
    const headers = createAuthHeaders(patient.id, UserRole.PATIENT);

    const response = await agent
      .post("/api/v1/bookings/start")
      .set("Origin", TEST_ORIGIN)
      .set(headers)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBeDefined();
    expect(response.body.error?.message).toMatch(/scheduleId/i);
  });

  it("should return 400 when scheduleId is empty string", async () => {
    const patient = await createTestUser({ role: UserRole.PATIENT });
    const headers = createAuthHeaders(patient.id, UserRole.PATIENT);

    const response = await agent
      .post("/api/v1/bookings/start")
      .set("Origin", TEST_ORIGIN)
      .set(headers)
      .set("Content-Type", "application/json")
      .send({ scheduleId: "" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error?.message).toMatch(/scheduleId/i);
  });
});
