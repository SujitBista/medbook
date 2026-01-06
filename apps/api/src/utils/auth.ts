/**
 * Authentication utility functions
 * Handles password hashing, JWT tokens, and password validation
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "@medbook/types";

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Hashes a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plain text password with a hashed password
 * @param password Plain text password
 * @param hash Hashed password
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a JWT token for a user
 * @param userId User ID
 * @param role User role
 * @returns JWT token string
 */
export function generateToken(userId: string, role: UserRole): string {
  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    id: userId,
    role,
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "7d", // Token expires in 7 days
  });
}

/**
 * Verifies and decodes a JWT token
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    // Validate required fields
    if (!decoded.id || !decoded.role) {
      return null;
    }

    // Validate role is a valid UserRole enum value
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(decoded.role)) {
      return null;
    }

    return decoded;
  } catch (error) {
    // jwt.verify throws errors for invalid tokens, expired tokens, etc.
    // Return null to indicate invalid token
    return null;
  }
}

/**
 * Validates password strength
 * Rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*)
 *
 * @param password Password to validate
 * @returns Validation result with errors if invalid
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*)"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
