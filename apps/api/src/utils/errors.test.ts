/**
 * Unit tests for error utilities
 */

import { describe, it, expect } from "vitest";
import {
  isAppError,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createRateLimitError,
  createAppError,
  type AppError,
} from "./errors";

describe("error utilities", () => {
  describe("isAppError", () => {
    it("should return true for valid AppError", () => {
      const error: AppError = {
        code: "TEST_ERROR",
        message: "Test error",
        statusCode: 400,
      };

      expect(isAppError(error)).toBe(true);
    });

    it("should return false for plain Error", () => {
      const error = new Error("Test error");

      expect(isAppError(error)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isAppError(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isAppError(undefined)).toBe(false);
    });

    it("should return false for object missing required fields", () => {
      const error = {
        code: "TEST_ERROR",
        message: "Test error",
        // missing statusCode
      };

      expect(isAppError(error)).toBe(false);
    });

    it("should return false for object with wrong types", () => {
      const error = {
        code: 123, // should be string
        message: "Test error",
        statusCode: 400,
      };

      expect(isAppError(error)).toBe(false);
    });
  });

  describe("createValidationError", () => {
    it("should create a validation error with default message", () => {
      const error = createValidationError("Invalid input");

      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
    });

    it("should include details when provided", () => {
      const details = { field: "email", reason: "invalid format" };
      const error = createValidationError("Invalid input", details);

      expect(error.details).toEqual(details);
    });
  });

  describe("createAuthenticationError", () => {
    it("should create an authentication error with default message", () => {
      const error = createAuthenticationError();

      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.message).toBe("Authentication required");
      expect(error.statusCode).toBe(401);
    });

    it("should create an authentication error with custom message", () => {
      const error = createAuthenticationError("Invalid credentials");

      expect(error.message).toBe("Invalid credentials");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("createAuthorizationError", () => {
    it("should create an authorization error with default message", () => {
      const error = createAuthorizationError();

      expect(error.code).toBe("AUTHORIZATION_ERROR");
      expect(error.message).toBe("Insufficient permissions");
      expect(error.statusCode).toBe(403);
    });

    it("should create an authorization error with custom message", () => {
      const error = createAuthorizationError("Access denied");

      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("createNotFoundError", () => {
    it("should create a not found error with default resource", () => {
      const error = createNotFoundError();

      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
    });

    it("should create a not found error with custom resource", () => {
      const error = createNotFoundError("User");

      expect(error.message).toBe("User not found");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("createConflictError", () => {
    it("should create a conflict error", () => {
      const error = createConflictError("Resource already exists");

      expect(error.code).toBe("CONFLICT_ERROR");
      expect(error.message).toBe("Resource already exists");
      expect(error.statusCode).toBe(409);
    });
  });

  describe("createRateLimitError", () => {
    it("should create a rate limit error with default message", () => {
      const error = createRateLimitError();

      expect(error.code).toBe("RATE_LIMIT_ERROR");
      expect(error.message).toBe("Too many requests");
      expect(error.statusCode).toBe(429);
    });

    it("should create a rate limit error with custom message", () => {
      const error = createRateLimitError("Rate limit exceeded");

      expect(error.message).toBe("Rate limit exceeded");
      expect(error.statusCode).toBe(429);
    });
  });

  describe("createAppError", () => {
    it("should create a generic app error with default status code", () => {
      const error = createAppError("INTERNAL_ERROR", "Something went wrong");

      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
    });

    it("should create a generic app error with custom status code", () => {
      const error = createAppError("CUSTOM_ERROR", "Custom error", 418);

      expect(error.code).toBe("CUSTOM_ERROR");
      expect(error.message).toBe("Custom error");
      expect(error.statusCode).toBe(418);
    });

    it("should include details when provided", () => {
      const details = { stack: "error stack" };
      const error = createAppError("ERROR", "Message", 500, details);

      expect(error.details).toEqual(details);
    });
  });
});
