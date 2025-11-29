/**
 * Appointment routes
 * Handles appointment booking and management endpoints
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getAppointment,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  createAppointmentSlot,
  updateAppointmentSlot,
} from "../controllers/appointment.controller";

const router: IRouter = Router();

/**
 * GET /api/v1/appointments/:id
 * Get appointment by ID (requires authentication)
 */
router.get("/:id", authenticate, getAppointment);

/**
 * GET /api/v1/appointments/patient/:patientId
 * Get appointments by patient ID (requires authentication)
 * Query params: status, startDate, endDate (optional)
 */
router.get("/patient/:patientId", authenticate, getAppointmentsByPatient);

/**
 * GET /api/v1/appointments/doctor/:doctorId
 * Get appointments by doctor ID (requires authentication)
 * Query params: status, startDate, endDate (optional)
 */
router.get("/doctor/:doctorId", authenticate, getAppointmentsByDoctor);

/**
 * POST /api/v1/appointments
 * Create appointment (requires authentication)
 */
router.post("/", authenticate, createAppointmentSlot);

/**
 * PUT /api/v1/appointments/:id
 * Update appointment (requires authentication)
 */
router.put("/:id", authenticate, updateAppointmentSlot);

export default router;
