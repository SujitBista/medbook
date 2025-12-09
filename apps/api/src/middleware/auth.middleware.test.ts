/**
 * Unit tests for authentication middleware
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Response, NextFunction } from "express";
import {
  authenticate,
  requireRole,
  AuthenticatedRequest,
} from "./auth.middleware";
import { UserRole } from "@medbook/types";
import { createTestToken } from "../__tests__/helpers";

describe("authenticate middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it("should authenticate request with valid Bearer token", () => {
    const userId = "test-user-id";
    const role = UserRole.PATIENT;
    const token = createTestToken(userId, role);

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticate(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.id).toBe(userId);
    expect(mockRequest.user?.role).toBe(role);
  });

  it("should reject request without Authorization header", () => {
    mockRequest.headers = {};

    authenticate(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "AUTHENTICATION_ERROR",
        statusCode: 401,
      })
    );
    expect(mockRequest.user).toBeUndefined();
  });

  it("should reject request with invalid token format", () => {
    mockRequest.headers = {
      authorization: "InvalidFormat token",
    };

    authenticate(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "AUTHENTICATION_ERROR",
        statusCode: 401,
      })
    );
  });

  it("should reject request with invalid token", () => {
    mockRequest.headers = {
      authorization: "Bearer invalid-token-here",
    };

    authenticate(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "AUTHENTICATION_ERROR",
        statusCode: 401,
      })
    );
  });

  it("should handle token without Bearer prefix", () => {
    const token = createTestToken("test-user-id", UserRole.PATIENT);
    mockRequest.headers = {
      authorization: token, // Missing "Bearer " prefix
    };

    authenticate(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "AUTHENTICATION_ERROR",
        statusCode: 401,
      })
    );
  });
});

describe("requireRole middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it("should allow access when user has required role", () => {
    mockRequest.user = {
      id: "test-user-id",
      role: UserRole.ADMIN,
    };

    const middleware = requireRole(UserRole.ADMIN);
    middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("should allow access when user has one of the required roles", () => {
    mockRequest.user = {
      id: "test-user-id",
      role: UserRole.DOCTOR,
    };

    const middleware = requireRole(UserRole.DOCTOR, UserRole.ADMIN);
    middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("should deny access when user does not have required role", () => {
    mockRequest.user = {
      id: "test-user-id",
      role: UserRole.PATIENT,
    };

    const middleware = requireRole(UserRole.ADMIN);
    middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "AUTHORIZATION_ERROR",
        statusCode: 403,
      })
    );
  });

  it("should deny access when user does not have any of the required roles", () => {
    mockRequest.user = {
      id: "test-user-id",
      role: UserRole.PATIENT,
    };

    const middleware = requireRole(UserRole.DOCTOR, UserRole.ADMIN);
    middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "AUTHORIZATION_ERROR",
        statusCode: 403,
      })
    );
  });

  it("should require authentication before checking role", () => {
    mockRequest.user = undefined;

    const middleware = requireRole(UserRole.ADMIN);
    middleware(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "AUTHENTICATION_ERROR",
        statusCode: 401,
      })
    );
  });
});
