/**
 * Admin routes
 * Handles admin-only endpoints
 * All routes require ADMIN role
 */

import { Router, type IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "@medbook/types";
import {
  listUsers,
  getUser,
  updateRole,
  removeUser,
  getStats,
  registerDoctor,
  listDoctors,
  getDoctor,
  updateDoctorProfile,
  removeDoctor,
  getDoctorStatistics,
} from "../controllers/admin.controller";

const router: IRouter = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

/**
 * GET /api/v1/admin/stats
 * Get system statistics
 */
router.get("/stats", getStats);

/**
 * GET /api/v1/admin/users
 * Get all users
 */
router.get("/users", listUsers);

/**
 * GET /api/v1/admin/users/:id
 * Get user by ID
 */
router.get("/users/:id", getUser);

/**
 * PUT /api/v1/admin/users/:id/role
 * Update user role
 */
router.put("/users/:id/role", updateRole);

/**
 * DELETE /api/v1/admin/users/:id
 * Delete user
 */
router.delete("/users/:id", removeUser);

/**
 * POST /api/v1/admin/doctors
 * Register a new doctor user (creates user with DOCTOR role and doctor profile)
 */
router.post("/doctors", registerDoctor);

/**
 * GET /api/v1/admin/doctors
 * Get all doctors with pagination and search
 */
router.get("/doctors", listDoctors);

/**
 * GET /api/v1/admin/doctors/stats
 * Get doctor statistics
 */
router.get("/doctors/stats", getDoctorStatistics);

/**
 * GET /api/v1/admin/doctors/:id
 * Get doctor by ID
 */
router.get("/doctors/:id", getDoctor);

/**
 * PUT /api/v1/admin/doctors/:id
 * Update doctor profile
 */
router.put("/doctors/:id", updateDoctorProfile);

/**
 * DELETE /api/v1/admin/doctors/:id
 * Delete doctor
 */
router.delete("/doctors/:id", removeDoctor);

export default router;
