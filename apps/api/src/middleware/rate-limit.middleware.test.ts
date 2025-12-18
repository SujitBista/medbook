/**
 * Tests for rate limiting middleware
 */

import express, { type Express } from "express";
import request from "supertest";
import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit.middleware";
import { errorHandler } from "./error.middleware";

function createTestApp(
  windowMs: number,
  maxRequests: number,
  keyGenerator?: (req: express.Request) => string
): Express {
  const app = express();
  const limiter = createRateLimiter({ windowMs, maxRequests, keyGenerator });

  app.use(limiter);
  app.get("/test", (_req, res) => {
    res.json({ success: true });
  });

  // Attach error handler to convert AppError into standard responses
  app.use(errorHandler);

  return app;
}

describe("rate-limit.middleware", () => {
  it("allows requests under the limit", async () => {
    const app = createTestApp(1_000, 2);

    const res1 = await request(app).get("/test").expect(200);
    const res2 = await request(app).get("/test").expect(200);

    expect(res1.body.success).toBe(true);
    expect(res2.body.success).toBe(true);
  });

  it("blocks requests over the limit with 429 error", async () => {
    const app = createTestApp(1_000, 2);

    await request(app).get("/test").expect(200);
    await request(app).get("/test").expect(200);
    const res = await request(app).get("/test").expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("RATE_LIMIT_ERROR");
  });

  it("uses custom keyGenerator so different keys have independent limits", async () => {
    const app = createTestApp(
      1_000,
      1,
      (req) => (req.headers["x-test-key"] as string) ?? "default"
    );

    // First request for key "a" should pass
    await request(app).get("/test").set("x-test-key", "a").expect(200);

    // Second request for key "a" should be blocked
    await request(app).get("/test").set("x-test-key", "a").expect(429);

    // First request for key "b" should still pass
    await request(app).get("/test").set("x-test-key", "b").expect(200);
  });

  it("resets counters after the window elapses", async () => {
    const app = createTestApp(50, 1); // 50ms window, 1 request allowed

    await request(app).get("/test").expect(200);
    await request(app).get("/test").expect(429);

    // Wait for the window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // After reset, request should be allowed again
    const res = await request(app).get("/test").expect(200);
    expect(res.body.success).toBe(true);
  });
});
