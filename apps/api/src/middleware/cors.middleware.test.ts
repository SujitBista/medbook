/**
 * Unit tests for CORS middleware
 * Using Supertest for integration-style testing since CORS middleware needs real Express objects
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, createTestAgent } from "../__tests__/helpers";

describe("corsMiddleware", () => {
  let app: ReturnType<typeof createTestApp>;
  let agent: ReturnType<typeof createTestAgent>;

  beforeEach(() => {
    // Set environment variables before creating the app
    process.env.CORS_ORIGIN = "http://localhost:3000";
    process.env.CORS_ALLOW_NO_ORIGIN = "true"; // Default: allow no origin in tests
    process.env.CORS_ALLOW_NULL_ORIGIN = "false";

    // Create fresh app instance after setting env vars
    app = createTestApp();
    agent = createTestAgent(app);
  });

  it("should allow request from whitelisted origin", async () => {
    const response = await agent
      .get("/")
      .set("Origin", "http://localhost:3000")
      .expect(200);

    expect(response.body).toBeDefined();
  });

  it("should deny request from non-whitelisted origin", async () => {
    const response = await agent
      .get("/")
      .set("Origin", "http://malicious-site.com")
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe("CORS_ERROR");
  });

  it("should handle request without origin header when CORS_ALLOW_NO_ORIGIN is true", async () => {
    // Test that requests without origin are allowed when CORS_ALLOW_NO_ORIGIN is true
    const response = await agent.get("/").expect(200);

    expect(response.body).toBeDefined();
  });

  it("should normalize origin before checking", async () => {
    // Different case and trailing slash should be normalized and allowed
    const response = await agent
      .get("/")
      .set("Origin", "HTTP://LOCALHOST:3000/")
      .expect(200);

    expect(response.body).toBeDefined();
  });

  it("should handle OPTIONS preflight request", async () => {
    const response = await agent
      .options("/")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .expect(204);

    // OPTIONS requests should return 204 No Content
    expect(response.headers["access-control-allow-origin"]).toBeDefined();
  });

  describe("when CORS_ALLOW_NO_ORIGIN is false", () => {
    let appNoOrigin: ReturnType<typeof createTestApp>;
    let agentNoOrigin: ReturnType<typeof createTestAgent>;

    beforeEach(() => {
      // Set CORS_ALLOW_NO_ORIGIN to false before creating app
      process.env.CORS_ORIGIN = "http://localhost:3000";
      process.env.CORS_ALLOW_NO_ORIGIN = "false";
      process.env.CORS_ALLOW_NULL_ORIGIN = "false";

      // Create fresh app instance with the new env config
      appNoOrigin = createTestApp();
      agentNoOrigin = createTestAgent(appNoOrigin);
    });

    it("should deny request without origin header", async () => {
      const response = await agentNoOrigin.get("/").expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("CORS_ERROR");
    });
  });
});
