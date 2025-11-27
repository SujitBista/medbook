/**
 * Test fixtures
 * Reusable test data for tests
 */

import { UserRole, CreateUserInput } from "@medbook/types";

/**
 * Creates a test user input
 */
export function createTestUserInput(
  overrides?: Partial<CreateUserInput>
): CreateUserInput {
  return {
    email: `test-${Date.now()}@example.com`,
    password: "Test123!@#",
    role: UserRole.PATIENT,
    ...overrides,
  };
}

/**
 * Creates a test user input with valid password
 */
export function createValidUserInput(
  overrides?: Partial<CreateUserInput>
): CreateUserInput {
  return createTestUserInput({
    password: "ValidPass123!",
    ...overrides,
  });
}

/**
 * Creates a test user input with invalid password
 */
export function createInvalidPasswordUserInput(
  overrides?: Partial<CreateUserInput>
): CreateUserInput {
  return createTestUserInput({
    password: "weak",
    ...overrides,
  });
}

/**
 * Test user IDs for mocking
 */
export const TEST_USER_IDS = {
  PATIENT: "test-patient-id",
  DOCTOR: "test-doctor-id",
  ADMIN: "test-admin-id",
} as const;
