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
    // Disable CORS bypass for CORS tests so they can verify CORS behavior
    process.env.CORS_ALLOW_ALL_ORIGINS_IN_TEST = "false";

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

  it("should allow Vercel preview URLs (*.vercel.app)", async () => {
    // Test various Vercel preview URL patterns
    const vercelUrls = [
      "https://medbook-lake.vercel.app",
      "https://medbook-git-main-username.vercel.app",
      "https://medbook-dqplvleue-sujitbista-1762s-projects.vercel.app",
      "https://medbook-abc123def456.vercel.app",
    ];

    for (const url of vercelUrls) {
      const response = await agent.get("/").set("Origin", url).expect(200);
      expect(response.body).toBeDefined();
    }
  });

  it("should allow Vercel preview URLs with different cases", async () => {
    // Test that case doesn't matter (normalized to lowercase)
    const response = await agent
      .get("/")
      .set("Origin", "HTTPS://MEDBOOK-LAKE.VERCEL.APP")
      .expect(200);

    expect(response.body).toBeDefined();
  });

  it("should allow Vercel preview URLs with trailing slash", async () => {
    // Test that trailing slash is normalized
    const response = await agent
      .get("/")
      .set("Origin", "https://medbook-lake.vercel.app/")
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

  it("should handle OPTIONS preflight request from Vercel preview URL", async () => {
    const response = await agent
      .options("/")
      .set(
        "Origin",
        "https://medbook-dqplvleue-sujitbista-1762s-projects.vercel.app"
      )
      .set("Access-Control-Request-Method", "GET")
      .expect(204);

    // OPTIONS requests should return 204 No Content
    expect(response.headers["access-control-allow-origin"]).toBeDefined();
  });

  describe("no-origin requests", () => {
    it("should allow no-origin requests in development mode", async () => {
      // Set NODE_ENV to development (or leave unset, which defaults to development)
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      process.env.CORS_ORIGIN = "http://localhost:3000";
      process.env.CORS_ALLOW_NO_ORIGIN = "false"; // Even when false, dev mode allows it
      process.env.CORS_ALLOW_NULL_ORIGIN = "false";

      const devApp = createTestApp();
      const devAgent = createTestAgent(devApp);

      // In development, no-origin requests should be allowed automatically
      const response = await devAgent.get("/").expect(200);
      expect(response.body).toBeDefined();

      // Restore original NODE_ENV
      if (originalNodeEnv) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it("should deny no-origin requests in production when CORS_ALLOW_NO_ORIGIN is false", async () => {
      // Set NODE_ENV to production to test production behavior
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      process.env.CORS_ORIGIN = "http://localhost:3000";
      process.env.CORS_ALLOW_NO_ORIGIN = "false";
      process.env.CORS_ALLOW_NULL_ORIGIN = "false";

      const prodApp = createTestApp();
      const prodAgent = createTestAgent(prodApp);

      // In production, no-origin requests should be denied when flag is false
      const response = await prodAgent.get("/").expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe("CORS_ERROR");

      // Restore original NODE_ENV
      if (originalNodeEnv) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it("should allow no-origin requests in production when CORS_ALLOW_NO_ORIGIN is true", async () => {
      // Set NODE_ENV to production but allow no-origin
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      process.env.CORS_ORIGIN = "http://localhost:3000";
      process.env.CORS_ALLOW_NO_ORIGIN = "true";
      process.env.CORS_ALLOW_NULL_ORIGIN = "false";

      const prodApp = createTestApp();
      const prodAgent = createTestAgent(prodApp);

      // In production, no-origin requests should be allowed when flag is true
      const response = await prodAgent.get("/").expect(200);
      expect(response.body).toBeDefined();

      // Restore original NODE_ENV
      if (originalNodeEnv) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });
  });
});
