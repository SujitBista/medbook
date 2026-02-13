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
  getAppointmentStatistics,
  getSystemHealthStatus,
  getCommissionSettings,
  createCommissionSettingsForDoctor,
  updateCommissionSettingsForDoctor,
  createSchedulingException,
  listSchedulingExceptions,
  deleteSchedulingException,
  getSchedulingException,
  createScheduleHandler,
  getSchedulesHandler,
  updateScheduleHandler,
  deleteScheduleHandler,
  createManualBookingHandler,
  listDepartments,
  getDepartment,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
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
 * GET /api/v1/admin/health
 * Get system health status
 */
router.get("/health", getSystemHealthStatus);

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
 * GET /api/v1/admin/appointments/stats
 * Get appointment statistics
 */
router.get("/appointments/stats", getAppointmentStatistics);

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

/**
 * GET /api/v1/admin/doctors/:doctorId/commission-settings
 * Get commission settings for a doctor
 */
router.get("/doctors/:doctorId/commission-settings", getCommissionSettings);

/**
 * POST /api/v1/admin/doctors/:doctorId/commission-settings
 * Create commission settings for a doctor
 */
router.post(
  "/doctors/:doctorId/commission-settings",
  createCommissionSettingsForDoctor
);

/**
 * PUT /api/v1/admin/doctors/:doctorId/commission-settings
 * Update commission settings for a doctor
 */
router.put(
  "/doctors/:doctorId/commission-settings",
  updateCommissionSettingsForDoctor
);

/**
 * POST /api/v1/admin/scheduling/exceptions
 * Create schedule exception(s)
 */
router.post("/scheduling/exceptions", createSchedulingException);

/**
 * GET /api/v1/admin/scheduling/exceptions
 * List schedule exceptions (optional query: doctorId, startDate, endDate, type)
 */
router.get("/scheduling/exceptions", listSchedulingExceptions);

/**
 * GET /api/v1/admin/scheduling/exceptions/:id
 * Get schedule exception by ID
 */
router.get("/scheduling/exceptions/:id", getSchedulingException);

/**
 * DELETE /api/v1/admin/scheduling/exceptions/:id
 * Delete schedule exception
 */
router.delete("/scheduling/exceptions/:id", deleteSchedulingException);

/**
 * POST /api/v1/admin/schedules
 * Create capacity schedule (doctorId, date, startTime, endTime, maxPatients)
 */
router.post("/schedules", createScheduleHandler);

/**
 * GET /api/v1/admin/schedules
 * List schedules (query: doctorId, date, startDate, endDate)
 */
router.get("/schedules", getSchedulesHandler);

/**
 * PATCH /api/v1/admin/schedules/:id
 * Update capacity schedule
 */
router.patch("/schedules/:id", updateScheduleHandler);

/**
 * DELETE /api/v1/admin/schedules/:id
 * Delete capacity schedule
 */
router.delete("/schedules/:id", deleteScheduleHandler);

/**
 * POST /api/v1/admin/bookings/manual
 * Create manual booking (scheduleId, patientId, paymentProvider: CASH|ESEWA, note?)
 */
router.post("/bookings/manual", createManualBookingHandler);

/**
 * GET /api/v1/admin/departments
 * List all departments with search keywords
 */
router.get("/departments", listDepartments);

/**
 * GET /api/v1/admin/departments/:id
 * Get department by ID
 */
router.get("/departments/:id", getDepartment);

/**
 * POST /api/v1/admin/departments
 * Create department (body: name, searchKeywords comma-separated)
 */
router.post("/departments", createDepartmentHandler);

/**
 * PUT /api/v1/admin/departments/:id
 * Update department (body: name?, searchKeywords?)
 */
router.put("/departments/:id", updateDepartmentHandler);

/**
 * DELETE /api/v1/admin/departments/:id
 * Delete department
 */
router.delete("/departments/:id", deleteDepartmentHandler);

export default router;
