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

// Always override DATABASE_URL in test mode to prevent tests from running against real databases
// This ensures test isolation even if developers have DATABASE_URL set in their .env
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/medbook_test";

beforeAll(async () => {
  // Setup before all tests
});

afterAll(async () => {
  // Cleanup after all tests
});
