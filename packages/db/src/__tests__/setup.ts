/**
 * Test setup file for database tests
 * Runs before all tests to configure the test environment
 */

import { beforeAll, afterAll } from "vitest";

// Set test environment variables
process.env.NODE_ENV = "test";

// Force a consistent test database connection
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
