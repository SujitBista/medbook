/**
 * Test setup file
 * Runs before all tests to configure the test environment
 */

import { beforeAll, afterAll } from "vitest";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
process.env.PORT = "4000";
process.env.API_URL = "http://localhost:4000";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.CORS_ALLOW_NO_ORIGIN = "true"; // Allow requests without origin in tests

// Set DATABASE_URL for tests if not already set
// Use a test database URL - can be overridden via environment variable
if (!process.env.DATABASE_URL) {
  // Default to a test database - users should set DATABASE_URL in their environment
  // or use a test-specific database URL
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/medbook_test";
}

beforeAll(async () => {
  // Setup before all tests
});

afterAll(async () => {
  // Cleanup after all tests
});
