/**
 * Unit tests for role utilities
 */

import { describe, it, expect } from "vitest";
import {
  hasRole,
  hasAnyRole,
  isAdmin,
  isDoctor,
  isPatient,
  isAdminOrDoctor,
  isAdminOrPatient,
} from "./roles";
import { UserRole } from "@medbook/types";

describe("role utilities", () => {
  describe("hasRole", () => {
    it("should return true when user has the required role", () => {
      expect(hasRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
      expect(hasRole(UserRole.DOCTOR, UserRole.DOCTOR)).toBe(true);
      expect(hasRole(UserRole.PATIENT, UserRole.PATIENT)).toBe(true);
    });

    it("should return false when user does not have the required role", () => {
      expect(hasRole(UserRole.PATIENT, UserRole.ADMIN)).toBe(false);
      expect(hasRole(UserRole.DOCTOR, UserRole.PATIENT)).toBe(false);
      expect(hasRole(UserRole.ADMIN, UserRole.DOCTOR)).toBe(false);
    });
  });

  describe("hasAnyRole", () => {
    it("should return true when user has one of the required roles", () => {
      expect(
        hasAnyRole(UserRole.ADMIN, [UserRole.ADMIN, UserRole.DOCTOR])
      ).toBe(true);
      expect(
        hasAnyRole(UserRole.DOCTOR, [UserRole.ADMIN, UserRole.DOCTOR])
      ).toBe(true);
      expect(
        hasAnyRole(UserRole.PATIENT, [UserRole.PATIENT, UserRole.DOCTOR])
      ).toBe(true);
    });

    it("should return false when user does not have any of the required roles", () => {
      expect(
        hasAnyRole(UserRole.PATIENT, [UserRole.ADMIN, UserRole.DOCTOR])
      ).toBe(false);
      expect(
        hasAnyRole(UserRole.DOCTOR, [UserRole.ADMIN, UserRole.PATIENT])
      ).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin role", () => {
      expect(isAdmin(UserRole.ADMIN)).toBe(true);
    });

    it("should return false for non-admin roles", () => {
      expect(isAdmin(UserRole.DOCTOR)).toBe(false);
      expect(isAdmin(UserRole.PATIENT)).toBe(false);
    });
  });

  describe("isDoctor", () => {
    it("should return true for doctor role", () => {
      expect(isDoctor(UserRole.DOCTOR)).toBe(true);
    });

    it("should return false for non-doctor roles", () => {
      expect(isDoctor(UserRole.ADMIN)).toBe(false);
      expect(isDoctor(UserRole.PATIENT)).toBe(false);
    });
  });

  describe("isPatient", () => {
    it("should return true for patient role", () => {
      expect(isPatient(UserRole.PATIENT)).toBe(true);
    });

    it("should return false for non-patient roles", () => {
      expect(isPatient(UserRole.ADMIN)).toBe(false);
      expect(isPatient(UserRole.DOCTOR)).toBe(false);
    });
  });

  describe("isAdminOrDoctor", () => {
    it("should return true for admin role", () => {
      expect(isAdminOrDoctor(UserRole.ADMIN)).toBe(true);
    });

    it("should return true for doctor role", () => {
      expect(isAdminOrDoctor(UserRole.DOCTOR)).toBe(true);
    });

    it("should return false for patient role", () => {
      expect(isAdminOrDoctor(UserRole.PATIENT)).toBe(false);
    });
  });

  describe("isAdminOrPatient", () => {
    it("should return true for admin role", () => {
      expect(isAdminOrPatient(UserRole.ADMIN)).toBe(true);
    });

    it("should return true for patient role", () => {
      expect(isAdminOrPatient(UserRole.PATIENT)).toBe(true);
    });

    it("should return false for doctor role", () => {
      expect(isAdminOrPatient(UserRole.DOCTOR)).toBe(false);
    });
  });
});
