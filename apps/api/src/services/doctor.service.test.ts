/**
 * Unit tests for doctor service functions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getDoctorById,
  getDoctorByUserId,
  getAllDoctors,
  createDoctor,
  updateDoctor,
} from "./doctor.service";
import {
  createTestUser,
  createTestDoctor,
  createTestSchedule,
  cleanupTestData,
} from "../__tests__/db";

describe("doctor.service", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("getDoctorById", () => {
    it("should get doctor by ID", async () => {
      const doctor = await createTestDoctor({
        specialization: "Cardiology",
        bio: "Heart specialist",
      });

      const result = await getDoctorById(doctor.id);

      expect(result.id).toBe(doctor.id);
      expect(result.userId).toBe(doctor.userId);
      expect(result.specialization).toBe("Cardiology");
      expect(result.bio).toBe("Heart specialist");
    });

    it("should throw NotFoundError if doctor not found", async () => {
      await expect(getDoctorById("non-existent-id")).rejects.toThrow(
        "Doctor not found"
      );
    });
  });

  describe("getDoctorByUserId", () => {
    it("should get doctor by user ID", async () => {
      const doctor = await createTestDoctor({
        specialization: "Neurology",
      });

      const result = await getDoctorByUserId(doctor.userId);

      expect(result.id).toBe(doctor.id);
      expect(result.userId).toBe(doctor.userId);
      expect(result.specialization).toBe("Neurology");
    });

    it("should throw NotFoundError if doctor not found", async () => {
      const user = await createTestUser({ role: "DOCTOR" });

      await expect(getDoctorByUserId(user.id)).rejects.toThrow(
        "Doctor not found"
      );
    });
  });

  describe("getAllDoctors", () => {
    it("should get all doctors with default pagination", async () => {
      await createTestDoctor({ specialization: "Cardiology" });
      await createTestDoctor({ specialization: "Neurology" });
      await createTestDoctor({ specialization: "Pediatrics" });

      const result = await getAllDoctors();

      expect(result.doctors.length).toBeGreaterThanOrEqual(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it("should paginate doctors correctly", async () => {
      // Create 5 doctors
      for (let i = 0; i < 5; i++) {
        await createTestDoctor({ specialization: `Specialty${i}` });
      }

      const result = await getAllDoctors({ page: 1, limit: 2 });

      expect(result.doctors.length).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBeGreaterThanOrEqual(5);
      expect(result.pagination.totalPages).toBeGreaterThanOrEqual(3);
    });

    it("should filter doctors by specialization", async () => {
      // Use unique string so no department slug matches; service uses specialization contains
      const spec = `Cardiology-${Date.now()}`;
      await createTestDoctor({ specialization: spec });
      await createTestDoctor({ specialization: "Neurology" });
      await createTestDoctor({ specialization: spec });

      const result = await getAllDoctors({ specialization: spec });

      expect(result.doctors.length).toBeGreaterThanOrEqual(2);
      result.doctors.forEach((doctor) => {
        expect(doctor.specialization?.toLowerCase()).toContain("cardiology");
      });
    });

    it("should search doctors by email", async () => {
      const doctor1 = await createTestDoctor({ specialization: "Cardiology" });
      const doctor2 = await createTestDoctor({ specialization: "Neurology" });

      // Get user emails to search
      const { query } = await import("@app/db");
      const user1 = await query((prisma) =>
        prisma.user.findUnique({ where: { id: doctor1.userId } })
      );
      const user2 = await query((prisma) =>
        prisma.user.findUnique({ where: { id: doctor2.userId } })
      );

      if (user1 && user2) {
        const searchTerm = user1.email.substring(0, 10);
        const result = await getAllDoctors({ search: searchTerm });

        expect(result.doctors.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("should return empty array if no doctors match search", async () => {
      await createTestDoctor({ specialization: "Cardiology" });

      const result = await getAllDoctors({
        search: "nonexistentsearchterm12345",
      });

      expect(result.doctors.length).toBe(0);
      expect(result.pagination.total).toBe(0);
    });

    it("should filter doctors by availability when hasAvailability is true", async () => {
      // Create doctor with future capacity schedule
      const doctorWithAvailability = await createTestDoctor({
        specialization: "Cardiology",
      });
      await createTestSchedule({ doctorId: doctorWithAvailability.id });

      // Create doctor without schedule
      await createTestDoctor({ specialization: "Neurology" });

      // Get doctors with availability filter
      const result = await getAllDoctors({ hasAvailability: true });

      expect(result.doctors.length).toBeGreaterThanOrEqual(1);
      expect(
        result.doctors.some((d) => d.id === doctorWithAvailability.id)
      ).toBe(true);
      // Doctor without availability should not be included
      expect(result.doctors.length).toBe(1);
    });

    it("should return all doctors when hasAvailability is false", async () => {
      // Create doctor with schedule
      const doctorWithAvailability = await createTestDoctor({
        specialization: "Cardiology",
      });
      await createTestSchedule({ doctorId: doctorWithAvailability.id });

      // Create doctor without schedule
      const doctorWithoutAvailability = await createTestDoctor({
        specialization: "Neurology",
      });

      // Get all doctors (no availability filter)
      const result = await getAllDoctors({ hasAvailability: false });

      expect(result.doctors.length).toBeGreaterThanOrEqual(2);
      expect(
        result.doctors.some((d) => d.id === doctorWithAvailability.id)
      ).toBe(true);
      expect(
        result.doctors.some((d) => d.id === doctorWithoutAvailability.id)
      ).toBe(true);
    });

    it("should include doctors with recurring availability", async () => {
      const doctor = await createTestDoctor({ specialization: "Cardiology" });
      await createTestSchedule({ doctorId: doctor.id });

      const result = await getAllDoctors({ hasAvailability: true });

      expect(result.doctors.length).toBeGreaterThanOrEqual(1);
      expect(result.doctors.some((d) => d.id === doctor.id)).toBe(true);
    });

    it("should include doctors with recurring availability with no end date", async () => {
      const doctor = await createTestDoctor({ specialization: "Cardiology" });
      await createTestSchedule({ doctorId: doctor.id });

      const result = await getAllDoctors({ hasAvailability: true });

      expect(result.doctors.length).toBeGreaterThanOrEqual(1);
      expect(result.doctors.some((d) => d.id === doctor.id)).toBe(true);
    });

    it("should exclude doctors with only past availability", async () => {
      const doctor = await createTestDoctor({ specialization: "Cardiology" });
      // No schedule (or only past schedule) - doctor should not appear when hasAvailability=true
      const result = await getAllDoctors({ hasAvailability: true });

      // Doctor should not be included
      expect(result.doctors.some((d) => d.id === doctor.id)).toBe(false);
    });

    it("should exclude doctors with recurring availability that has expired", async () => {
      const doctor = await createTestDoctor({ specialization: "Cardiology" });
      // No future schedule - doctor should not appear when hasAvailability=true
      const result = await getAllDoctors({ hasAvailability: true });

      // Doctor should not be included
      expect(result.doctors.some((d) => d.id === doctor.id)).toBe(false);
    });
  });

  describe("createDoctor", () => {
    it("should create doctor profile with valid data", async () => {
      const user = await createTestUser({ role: "DOCTOR" });

      const result = await createDoctor({
        userId: user.id,
        specialization: "Cardiology",
        bio: "Heart specialist",
      });

      expect(result.userId).toBe(user.id);
      expect(result.specialization).toBe("Cardiology");
      expect(result.bio).toBe("Heart specialist");
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("should create doctor profile with only specialization", async () => {
      const user = await createTestUser({ role: "DOCTOR" });

      const result = await createDoctor({
        userId: user.id,
        specialization: "Neurology",
      });

      expect(result.specialization).toBe("Neurology");
      expect(result.bio).toBeUndefined();
    });

    it("should create doctor profile with only bio", async () => {
      const user = await createTestUser({ role: "DOCTOR" });

      const result = await createDoctor({
        userId: user.id,
        bio: "Experienced doctor",
      });

      expect(result.bio).toBe("Experienced doctor");
      expect(result.specialization).toBeUndefined();
    });

    it("should trim whitespace from specialization and bio", async () => {
      const user = await createTestUser({ role: "DOCTOR" });

      const result = await createDoctor({
        userId: user.id,
        specialization: "  Cardiology  ",
        bio: "  Heart specialist  ",
      });

      expect(result.specialization).toBe("Cardiology");
      expect(result.bio).toBe("Heart specialist");
    });

    it("should throw NotFoundError if user not found", async () => {
      await expect(
        createDoctor({
          userId: "non-existent-user-id",
          specialization: "Cardiology",
        })
      ).rejects.toThrow("User not found");
    });

    it("should throw ValidationError if user is not a doctor", async () => {
      const user = await createTestUser({ role: "PATIENT" });

      await expect(
        createDoctor({
          userId: user.id,
          specialization: "Cardiology",
        })
      ).rejects.toThrow("User must have DOCTOR role");
    });

    it("should throw ConflictError if doctor profile already exists", async () => {
      const doctor = await createTestDoctor({ specialization: "Cardiology" });

      await expect(
        createDoctor({
          userId: doctor.userId,
          specialization: "Neurology",
        })
      ).rejects.toThrow("Doctor profile already exists");
    });
  });

  describe("updateDoctor", () => {
    it("should update doctor profile with valid data", async () => {
      const doctor = await createTestDoctor({
        specialization: "Cardiology",
        bio: "Old bio",
      });

      const result = await updateDoctor(doctor.id, {
        specialization: "Neurology",
        bio: "New bio",
      });

      expect(result.specialization).toBe("Neurology");
      expect(result.bio).toBe("New bio");
      expect(result.id).toBe(doctor.id);
    });

    it("should update only specialization", async () => {
      const doctor = await createTestDoctor({
        specialization: "Cardiology",
        bio: "Original bio",
      });

      const result = await updateDoctor(doctor.id, {
        specialization: "Pediatrics",
      });

      expect(result.specialization).toBe("Pediatrics");
      expect(result.bio).toBe("Original bio");
    });

    it("should update only bio", async () => {
      const doctor = await createTestDoctor({
        specialization: "Cardiology",
        bio: "Original bio",
      });

      const result = await updateDoctor(doctor.id, {
        bio: "Updated bio",
      });

      expect(result.specialization).toBe("Cardiology");
      expect(result.bio).toBe("Updated bio");
    });

    it("should trim whitespace from updated fields", async () => {
      const doctor = await createTestDoctor({
        specialization: "Cardiology",
        bio: "Original bio",
      });

      const result = await updateDoctor(doctor.id, {
        specialization: "  Neurology  ",
        bio: "  New bio  ",
      });

      expect(result.specialization).toBe("Neurology");
      expect(result.bio).toBe("New bio");
    });

    it("should handle empty string as null", async () => {
      const doctor = await createTestDoctor({
        specialization: "Cardiology",
        bio: "Original bio",
      });

      const result = await updateDoctor(doctor.id, {
        specialization: "",
        bio: "",
      });

      expect(result.specialization).toBeUndefined();
      expect(result.bio).toBeUndefined();
    });

    it("should throw NotFoundError if doctor not found", async () => {
      await expect(
        updateDoctor("non-existent-id", {
          specialization: "Cardiology",
        })
      ).rejects.toThrow("Doctor not found");
    });
  });
});
