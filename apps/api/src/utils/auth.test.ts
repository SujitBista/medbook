/**
 * Unit tests for authentication utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  validatePassword,
} from "./auth";
import { UserRole } from "@medbook/types";

describe("auth utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "Test123!@#";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for the same password", async () => {
      const password = "Test123!@#";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // bcrypt includes salt, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching password and hash", async () => {
      const password = "Test123!@#";
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should return false for non-matching password and hash", async () => {
      const password = "Test123!@#";
      const wrongPassword = "WrongPass123!";
      const hash = await hashPassword(password);
      const isValid = await comparePassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });
  });

  describe("generateToken", () => {
    beforeEach(() => {
      // Ensure JWT_SECRET is set for tests
      process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
    });

    it("should generate a JWT token", () => {
      const userId = "test-user-id";
      const role = UserRole.PATIENT;
      const token = generateToken(userId, role);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should generate different tokens for different users", () => {
      const token1 = generateToken("user-1", UserRole.PATIENT);
      const token2 = generateToken("user-2", UserRole.PATIENT);

      expect(token1).not.toBe(token2);
    });

    it("should include user role in token", () => {
      const userId = "test-user-id";
      const role = UserRole.DOCTOR;
      const token = generateToken(userId, role);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe(role);
      expect(decoded?.id).toBe(userId);
    });
  });

  describe("verifyToken", () => {
    beforeEach(() => {
      process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
    });

    it("should verify a valid token", () => {
      const userId = "test-user-id";
      const role = UserRole.PATIENT;
      const token = generateToken(userId, role);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(userId);
      expect(decoded?.role).toBe(role);
    });

    it("should return null for invalid token", () => {
      const invalidToken = "invalid.token.here";
      const decoded = verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should return null for malformed token", () => {
      const malformedToken = "not-a-valid-token";
      const decoded = verifyToken(malformedToken);

      expect(decoded).toBeNull();
    });

    it("should return null for empty string", () => {
      const decoded = verifyToken("");

      expect(decoded).toBeNull();
    });
  });

  describe("validatePassword", () => {
    it("should validate a strong password", () => {
      const result = validatePassword("StrongPass123!");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = validatePassword("Short1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should reject password without uppercase letter", () => {
      const result = validatePassword("lowercase123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should reject password without lowercase letter", () => {
      const result = validatePassword("UPPERCASE123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should reject password without number", () => {
      const result = validatePassword("NoNumber!@#");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number"
      );
    });

    it("should reject password without special character", () => {
      const result = validatePassword("NoSpecial123");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character (!@#$%^&*)"
      );
    });

    it("should collect all validation errors", () => {
      const result = validatePassword("weak");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long"
      );
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
      expect(result.errors).toContain(
        "Password must contain at least one number"
      );
      expect(result.errors).toContain(
        "Password must contain at least one special character (!@#$%^&*)"
      );
    });

    it("should accept password with all required special characters", () => {
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*"];

      for (const char of specialChars) {
        const password = `Test123${char}`;
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      }
    });
  });
});
