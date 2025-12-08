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

// Force a consistent test database connection for all packages
// Priority: TEST_DATABASE_URL > DATABASE_URL > default
const defaultTestDbUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/medbook_test";
process.env.TEST_DATABASE_URL = defaultTestDbUrl;
process.env.DATABASE_URL = defaultTestDbUrl;
process.env.PGUSER = process.env.PGUSER || "postgres";
process.env.PGPASSWORD = process.env.PGPASSWORD || "postgres";
process.env.PGHOST = process.env.PGHOST || "localhost";
process.env.PGPORT = process.env.PGPORT || "5432";
process.env.PGDATABASE = process.env.PGDATABASE || "medbook_test";

beforeAll(async () => {
  // Setup before all tests
});

afterAll(async () => {
  // Cleanup after all tests
});
