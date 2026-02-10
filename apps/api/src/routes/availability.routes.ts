/**
 * Availability routes
 * Handles doctor availability/schedule endpoints
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getAvailability,
  getAvailabilitiesByDoctor,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getAvailabilityWindowsHandler,
} from "../controllers/availability.controller";

const router: IRouter = Router();

/**
 * GET /api/v1/availability/windows?doctorId=&date=
 * Get capacity windows for a doctor on a date (public)
 */
router.get("/windows", getAvailabilityWindowsHandler);

/**
 * GET /api/v1/availability/:id
 * Get availability by ID (public, no auth required)
 */
router.get("/:id", getAvailability);

/**
 * GET /api/v1/availability/doctor/:doctorId
 * Get availabilities by doctor ID (public, no auth required)
 * Query params: startDate, endDate (optional)
 */
router.get("/doctor/:doctorId", getAvailabilitiesByDoctor);

// Routes below require authentication
router.use(authenticate);

/**
 * POST /api/v1/availability
 * Create availability (requires authentication)
 */
router.post("/", createAvailabilitySlot);

/**
 * PUT /api/v1/availability/:id
 * Update availability (requires authentication)
 */
router.put("/:id", updateAvailabilitySlot);

/**
 * DELETE /api/v1/availability/:id
 * Delete availability (requires authentication)
 */
router.delete("/:id", deleteAvailabilitySlot);

export default router;
