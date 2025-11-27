/**
 * Test helper functions
 * Shared utilities for writing tests
 */

import { Express } from "express";
import request from "supertest";
import { createApp } from "../app";
import { generateToken } from "../utils/auth";
import { UserRole } from "@medbook/types";

/**
 * Creates a test Express app instance
 */
export function createTestApp(): Express {
  return createApp();
}

/**
 * Creates a test request agent for making HTTP requests
 */
export function createTestAgent(app: Express) {
  return request(app);
}

/**
 * Creates a JWT token for testing
 */
export function createTestToken(
  userId: string,
  role: UserRole = UserRole.PATIENT
): string {
  return generateToken(userId, role);
}

/**
 * Creates authorization headers with a test token
 */
export function createAuthHeaders(
  userId: string,
  role: UserRole = UserRole.PATIENT
): { Authorization: string } {
  const token = createTestToken(userId, role);
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Helper to wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
