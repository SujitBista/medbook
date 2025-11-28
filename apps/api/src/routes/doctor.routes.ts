/**
 * Doctor routes
 * Handles doctor management endpoints
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getDoctors,
  getDoctor,
  getDoctorByUser,
  registerDoctor,
  updateDoctorProfile,
} from "../controllers/doctor.controller";

const router: IRouter = Router();

/**
 * GET /api/v1/doctors
 * Get all doctors (public, no auth required)
 */
router.get("/", getDoctors);

/**
 * GET /api/v1/doctors/:id
 * Get doctor by ID (public, no auth required)
 */
router.get("/:id", getDoctor);

/**
 * GET /api/v1/doctors/user/:userId
 * Get doctor by user ID (public, no auth required)
 */
router.get("/user/:userId", getDoctorByUser);

// Routes below require authentication
router.use(authenticate);

/**
 * POST /api/v1/doctors
 * Create doctor profile (requires authentication)
 */
router.post("/", registerDoctor);

/**
 * PUT /api/v1/doctors/:id
 * Update doctor profile (requires authentication)
 */
router.put("/:id", updateDoctorProfile);

export default router;
