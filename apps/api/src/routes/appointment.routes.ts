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
  cancelAppointmentSlot,
  rescheduleAppointmentSlot,
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

/**
 * POST /api/v1/appointments/:id/cancel
 * Cancel appointment with role-based rules (requires authentication)
 * - Patients: Can cancel their own appointments at least 24 hours in advance
 * - Doctors: Can cancel appointments assigned to them at any time
 * - Admins: Can cancel any appointment at any time
 */
router.post("/:id/cancel", authenticate, cancelAppointmentSlot);

/**
 * POST /api/v1/appointments/:id/reschedule
 * Reschedule appointment to a new slot (requires authentication)
 * - Frees the old slot
 * - Books the new slot
 * - Sends reschedule confirmation email
 */
router.post("/:id/reschedule", authenticate, rescheduleAppointmentSlot);

export default router;
