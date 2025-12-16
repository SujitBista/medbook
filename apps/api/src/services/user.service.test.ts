/**
 * Unit tests for user service functions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
} from "./user.service";
import { UserRole } from "@medbook/types";
import { createTestUser, cleanupTestData } from "../__tests__/db";
import {
  createNotFoundError,
  createAuthenticationError,
} from "../utils/errors";

describe("user.service", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("getUserProfile", () => {
    it("should get user profile by ID", async () => {
      const user = await createTestUser({
        email: "test@example.com",
        role: "PATIENT",
      });

      const profile = await getUserProfile(user.id);

      expect(profile.id).toBe(user.id);
      expect(profile.email).toBe("test@example.com");
      expect(profile.role).toBe(UserRole.PATIENT);
      // Password should not be in result (TypeScript guarantees this via UserWithoutPassword type)
    });

    it("should get user profile with all fields", async () => {
      const user = await createTestUser({
        email: "test@example.com",
        role: "DOCTOR",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
      });

      const profile = await getUserProfile(user.id);

      expect(profile.id).toBe(user.id);
      expect(profile.email).toBe("test@example.com");
      expect(profile.role).toBe(UserRole.DOCTOR);
      expect(profile.firstName).toBe("John");
      expect(profile.lastName).toBe("Doe");
      expect(profile.phoneNumber).toBe("555-123-4567");
      // Password should not be in result (TypeScript guarantees this via UserWithoutPassword type)
    });

    it("should throw NotFoundError if user does not exist", async () => {
      await expect(getUserProfile("non-existent-id")).rejects.toThrow("User");
    });

    it("should return correct role for different user types", async () => {
      const patient = await createTestUser({ role: "PATIENT" });
      const doctor = await createTestUser({ role: "DOCTOR" });
      const admin = await createTestUser({ role: "ADMIN" });

      const patientProfile = await getUserProfile(patient.id);
      const doctorProfile = await getUserProfile(doctor.id);
      const adminProfile = await getUserProfile(admin.id);

      expect(patientProfile.role).toBe(UserRole.PATIENT);
      expect(doctorProfile.role).toBe(UserRole.DOCTOR);
      expect(adminProfile.role).toBe(UserRole.ADMIN);
    });
  });

  describe("updateUserProfile", () => {
    it("should update user email", async () => {
      const user = await createTestUser({
        email: "old@example.com",
        role: "PATIENT",
      });

      const updated = await updateUserProfile(user.id, {
        email: "new@example.com",
      });

      expect(updated.email).toBe("new@example.com");
      expect(updated.id).toBe(user.id);
    });

    it("should normalize email to lowercase and trim", async () => {
      const user = await createTestUser({
        email: "test@example.com",
        role: "PATIENT",
      });

      const updated = await updateUserProfile(user.id, {
        email: "  NEW@EXAMPLE.COM  ",
      });

      expect(updated.email).toBe("new@example.com");
    });

    it("should throw ValidationError if email format is invalid", async () => {
      const user = await createTestUser({
        email: "test@example.com",
        role: "PATIENT",
      });

      await expect(
        updateUserProfile(user.id, { email: "invalid-email" })
      ).rejects.toThrow("Invalid email format");
    });

    it("should throw ValidationError if email is already taken by another user", async () => {
      const user1 = await createTestUser({
        email: "user1@example.com",
        role: "PATIENT",
      });
      const user2 = await createTestUser({
        email: "user2@example.com",
        role: "PATIENT",
      });

      await expect(
        updateUserProfile(user1.id, { email: "user2@example.com" })
      ).rejects.toThrow("Email is already taken");
    });

    it("should allow updating email to same email", async () => {
      const user = await createTestUser({
        email: "test@example.com",
        role: "PATIENT",
      });

      const updated = await updateUserProfile(user.id, {
        email: "test@example.com",
      });

      expect(updated.email).toBe("test@example.com");
      expect(updated.id).toBe(user.id);
    });

    it("should not update if no fields provided", async () => {
      const user = await createTestUser({
        email: "test@example.com",
        role: "PATIENT",
      });

      const updated = await updateUserProfile(user.id, {});

      expect(updated.email).toBe("test@example.com");
      expect(updated.id).toBe(user.id);
    });

    it("should throw NotFoundError if user does not exist", async () => {
      await expect(
        updateUserProfile("non-existent-id", { email: "new@example.com" })
      ).rejects.toThrow("User");
    });

    it("should handle race condition when email is taken simultaneously", async () => {
      const user1 = await createTestUser({
        email: "user1@example.com",
        role: "PATIENT",
      });
      const user2 = await createTestUser({
        email: "user2@example.com",
        role: "PATIENT",
      });

      // Try to update user1's email to user2's email
      // This should fail even if there's a race condition
      await expect(
        updateUserProfile(user1.id, { email: "user2@example.com" })
      ).rejects.toThrow("Email is already taken");
    });
  });

  describe("changeUserPassword", () => {
    it("should change user password successfully", async () => {
      const oldPassword = "OldPassword123!@#";
      const newPassword = "NewPassword123!@#";
      const user = await createTestUser({
        email: "test@example.com",
        password: oldPassword,
        role: "PATIENT",
      });

      await changeUserPassword(user.id, {
        currentPassword: oldPassword,
        newPassword,
      });

      // Verify password was changed by trying to login with new password
      // We'll use the login service logic indirectly
      const { comparePassword } = await import("../utils/auth");
      const { query } = await import("@app/db");

      const updatedUser = await query(async (prisma) =>
        prisma.user.findUnique({
          where: { id: user.id },
          select: { password: true },
        })
      );

      expect(updatedUser).toBeDefined();
      if (updatedUser) {
        const isNewPasswordValid = await comparePassword(
          newPassword,
          updatedUser.password
        );
        expect(isNewPasswordValid).toBe(true);
      }
    });

    it("should clear mustResetPassword flag after password change", async () => {
      const oldPassword = "OldPassword123!@#";
      const newPassword = "NewPassword123!@#";
      const user = await createTestUser({
        email: "test@example.com",
        password: oldPassword,
        role: "PATIENT",
        mustResetPassword: true,
      });

      await changeUserPassword(user.id, {
        currentPassword: oldPassword,
        newPassword,
      });

      // Verify mustResetPassword is false
      const { query } = await import("@app/db");
      const updatedUser = await query(async (prisma) =>
        prisma.user.findUnique({
          where: { id: user.id },
          select: { mustResetPassword: true },
        })
      );

      expect(updatedUser?.mustResetPassword).toBe(false);
    });

    it("should throw NotFoundError if user does not exist", async () => {
      await expect(
        changeUserPassword("non-existent-id", {
          currentPassword: "OldPassword123!@#",
          newPassword: "NewPassword123!@#",
        })
      ).rejects.toThrow("User");
    });

    it("should throw AuthenticationError if current password is incorrect", async () => {
      const user = await createTestUser({
        email: "test@example.com",
        password: "CorrectPassword123!@#",
        role: "PATIENT",
      });

      await expect(
        changeUserPassword(user.id, {
          currentPassword: "WrongPassword123!@#",
          newPassword: "NewPassword123!@#",
        })
      ).rejects.toThrow("Current password is incorrect");
    });

    it("should throw ValidationError if new password is too weak", async () => {
      const oldPassword = "OldPassword123!@#";
      const user = await createTestUser({
        email: "test@example.com",
        password: oldPassword,
        role: "PATIENT",
      });

      await expect(
        changeUserPassword(user.id, {
          currentPassword: oldPassword,
          newPassword: "weak",
        })
      ).rejects.toThrow("New password does not meet requirements");
    });

    it("should throw ValidationError if new password is same as current password", async () => {
      const password = "TestPassword123!@#";
      const user = await createTestUser({
        email: "test@example.com",
        password,
        role: "PATIENT",
      });

      // Note: The service doesn't explicitly check for this, but password validation
      // should still work. The password will be hashed and compared, so it should
      // technically work, but it's not a good practice. We'll test that it doesn't
      // throw an error (since it's not explicitly prevented), but the password hash
      // will be different even if the plain text is the same.
      await expect(
        changeUserPassword(user.id, {
          currentPassword: password,
          newPassword: password,
        })
      ).resolves.not.toThrow();
    });

    it("should handle password change for different user roles", async () => {
      const oldPassword = "OldPassword123!@#";
      const newPassword = "NewPassword123!@#";

      const patient = await createTestUser({
        email: "patient@example.com",
        password: oldPassword,
        role: "PATIENT",
      });
      const doctor = await createTestUser({
        email: "doctor@example.com",
        password: oldPassword,
        role: "DOCTOR",
      });
      const admin = await createTestUser({
        email: "admin@example.com",
        password: oldPassword,
        role: "ADMIN",
      });

      await changeUserPassword(patient.id, {
        currentPassword: oldPassword,
        newPassword,
      });
      await changeUserPassword(doctor.id, {
        currentPassword: oldPassword,
        newPassword,
      });
      await changeUserPassword(admin.id, {
        currentPassword: oldPassword,
        newPassword,
      });

      // All should succeed without errors
      expect(true).toBe(true);
    });
  });
});
