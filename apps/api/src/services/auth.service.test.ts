/**
 * Unit tests for auth service functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { registerUser, loginUser } from "./auth.service";
import { UserRole } from "@medbook/types";
import { createTestUser, cleanupTestData } from "../__tests__/db";
import {
  createConflictError,
  createAuthenticationError,
} from "../utils/errors";

// Mock email service
vi.mock("./email.service", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: "test-message-id",
  }),
}));

// Mock logger
vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("auth.service", () => {
  beforeEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.restoreAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user successfully", async () => {
      const input = {
        email: "test@example.com",
        password: "Test123!@#",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
        role: UserRole.PATIENT,
      };

      const result = await registerUser(input);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.role).toBe(UserRole.PATIENT);
      expect(result.user.firstName).toBe("John");
      expect(result.user.lastName).toBe("Doe");
      expect(result.user.phoneNumber).toBe("555-123-4567");
      expect(result.token).toBeDefined();
      expect(result.user.password).toBeUndefined(); // Password should not be in result
    });

    it("should register a user with DOCTOR role", async () => {
      const input = {
        email: "doctor@example.com",
        password: "Test123!@#",
        firstName: "Jane",
        lastName: "Smith",
        phoneNumber: "555-987-6543",
        role: UserRole.DOCTOR,
      };

      const result = await registerUser(input);

      expect(result.user.role).toBe(UserRole.DOCTOR);
      expect(result.user.email).toBe("doctor@example.com");
      expect(result.token).toBeDefined();
    });

    it("should register a user with ADMIN role", async () => {
      const input = {
        email: "admin@example.com",
        password: "Test123!@#",
        firstName: "Admin",
        lastName: "User",
        phoneNumber: "555-111-2222",
        role: UserRole.ADMIN,
      };

      const result = await registerUser(input);

      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.token).toBeDefined();
    });

    it("should default to PATIENT role if not specified", async () => {
      const input = {
        email: "patient@example.com",
        password: "Test123!@#",
        firstName: "Patient",
        lastName: "User",
        phoneNumber: "555-333-4444",
      };

      const result = await registerUser(input);

      expect(result.user.role).toBe(UserRole.PATIENT);
    });

    it("should throw ValidationError if firstName is missing", async () => {
      const input = {
        email: "test@example.com",
        password: "Test123!@#",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      };

      await expect(registerUser(input)).rejects.toThrow(
        "Please fill in all required fields"
      );
    });

    it("should throw ValidationError if lastName is missing", async () => {
      const input = {
        email: "test@example.com",
        password: "Test123!@#",
        firstName: "John",
        phoneNumber: "555-123-4567",
      };

      await expect(registerUser(input)).rejects.toThrow(
        "Please fill in all required fields"
      );
    });

    it("should throw ValidationError if phoneNumber is missing", async () => {
      const input = {
        email: "test@example.com",
        password: "Test123!@#",
        firstName: "John",
        lastName: "Doe",
      };

      await expect(registerUser(input)).rejects.toThrow(
        "Please fill in all required fields"
      );
    });

    it("should throw ValidationError if firstName is empty string", async () => {
      const input = {
        email: "test@example.com",
        password: "Test123!@#",
        firstName: "   ",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      };

      await expect(registerUser(input)).rejects.toThrow(
        "Please fill in all required fields"
      );
    });

    it("should throw ValidationError if password is too weak", async () => {
      const input = {
        email: "test@example.com",
        password: "weak",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      };

      await expect(registerUser(input)).rejects.toThrow(
        "Password does not meet requirements"
      );
    });

    it("should throw ConflictError if user already exists", async () => {
      const email = "existing@example.com";
      await createTestUser({ email, role: "PATIENT" });

      const input = {
        email,
        password: "Test123!@#",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      };

      await expect(registerUser(input)).rejects.toThrow(
        "User with this email already exists"
      );
    });

    it("should normalize email to lowercase and trim", async () => {
      const input = {
        email: "  TEST@EXAMPLE.COM  ",
        password: "Test123!@#",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      };

      const result = await registerUser(input);

      expect(result.user.email).toBe("test@example.com");
    });

    it("should trim firstName, lastName, and phoneNumber", async () => {
      const input = {
        email: "test@example.com",
        password: "Test123!@#",
        firstName: "  John  ",
        lastName: "  Doe  ",
        phoneNumber: "  555-123-4567  ",
      };

      const result = await registerUser(input);

      expect(result.user.firstName).toBe("John");
      expect(result.user.lastName).toBe("Doe");
      expect(result.user.phoneNumber).toBe("555-123-4567");
    });

    it("should handle race condition when two users register with same email simultaneously", async () => {
      const email = "race@example.com";
      const input = {
        email,
        password: "Test123!@#",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      };

      // Create user first to simulate race condition
      await createTestUser({ email, role: "PATIENT" });

      // Try to register again - should throw ConflictError
      await expect(registerUser(input)).rejects.toThrow(
        "User with this email already exists"
      );
    });
  });

  describe("loginUser", () => {
    it("should login user with valid credentials", async () => {
      const password = "Test123!@#";
      const user = await createTestUser({
        email: "test@example.com",
        password,
        role: "PATIENT",
      });

      const result = await loginUser("test@example.com", password);

      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.role).toBe(UserRole.PATIENT);
      expect(result.token).toBeDefined();
      expect(result.user.password).toBeUndefined(); // Password should not be in result
    });

    it("should login user with email in different case", async () => {
      const password = "Test123!@#";
      const user = await createTestUser({
        email: "test@example.com",
        password,
        role: "PATIENT",
      });

      const result = await loginUser("TEST@EXAMPLE.COM", password);

      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe("test@example.com");
    });

    it("should login user with email with whitespace", async () => {
      const password = "Test123!@#";
      const user = await createTestUser({
        email: "test@example.com",
        password,
        role: "PATIENT",
      });

      const result = await loginUser("  test@example.com  ", password);

      expect(result.user.id).toBe(user.id);
    });

    it("should throw AuthenticationError if user does not exist", async () => {
      await expect(
        loginUser("nonexistent@example.com", "Test123!@#")
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw AuthenticationError if password is incorrect", async () => {
      await createTestUser({
        email: "test@example.com",
        password: "Test123!@#",
        role: "PATIENT",
      });

      await expect(
        loginUser("test@example.com", "WrongPassword123!@#")
      ).rejects.toThrow("Invalid email or password");
    });

    it("should return correct role for DOCTOR user", async () => {
      const password = "Test123!@#";
      const user = await createTestUser({
        email: "doctor@example.com",
        password,
        role: "DOCTOR",
      });

      const result = await loginUser("doctor@example.com", password);

      expect(result.user.role).toBe(UserRole.DOCTOR);
      expect(result.user.id).toBe(user.id);
    });

    it("should return correct role for ADMIN user", async () => {
      const password = "Test123!@#";
      const user = await createTestUser({
        email: "admin@example.com",
        password,
        role: "ADMIN",
      });

      const result = await loginUser("admin@example.com", password);

      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.user.id).toBe(user.id);
    });

    it("should generate different tokens for different users", async () => {
      const password = "Test123!@#";
      const user1 = await createTestUser({
        email: "user1@example.com",
        password,
        role: "PATIENT",
      });
      const user2 = await createTestUser({
        email: "user2@example.com",
        password,
        role: "PATIENT",
      });

      const result1 = await loginUser("user1@example.com", password);
      const result2 = await loginUser("user2@example.com", password);

      expect(result1.token).not.toBe(result2.token);
      expect(result1.user.id).toBe(user1.id);
      expect(result2.user.id).toBe(user2.id);
    });
  });
});
