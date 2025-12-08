/**
 * Appointment controller
 * Handles HTTP requests for appointment endpoints
 */

import { Request, Response, NextFunction } from "express";
import {
  getAppointmentById,
  getAppointmentsByPatientId,
  getAppointmentsByDoctorId,
  createAppointment,
  updateAppointment,
  cancelAppointment,
} from "../services/appointment.service";
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentStatus,
  CancelAppointmentInput,
  UserRole,
} from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Get appointment by ID
 * GET /api/v1/appointments/:id
 */
export async function getAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    const appointment = await getAppointmentById(id);

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get appointments by patient ID
 * GET /api/v1/appointments/patient/:patientId
 */
export async function getAppointmentsByPatient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    const status = req.query.status
      ? (req.query.status as AppointmentStatus)
      : undefined;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (!patientId) {
      const error = createValidationError("Patient ID is required");
      next(error);
      return;
    }

    // Validate dates if provided
    if (startDate && isNaN(startDate.getTime())) {
      const error = createValidationError("Invalid startDate format");
      next(error);
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      const error = createValidationError("Invalid endDate format");
      next(error);
      return;
    }

    // Validate status if provided
    if (status && !Object.values(AppointmentStatus).includes(status)) {
      const error = createValidationError("Invalid status");
      next(error);
      return;
    }

    const appointments = await getAppointmentsByPatientId(patientId, {
      status,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get appointments by doctor ID
 * GET /api/v1/appointments/doctor/:doctorId
 */
export async function getAppointmentsByDoctor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;
    const status = req.query.status
      ? (req.query.status as AppointmentStatus)
      : undefined;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Validate dates if provided
    if (startDate && isNaN(startDate.getTime())) {
      const error = createValidationError("Invalid startDate format");
      next(error);
      return;
    }

    if (endDate && isNaN(endDate.getTime())) {
      const error = createValidationError("Invalid endDate format");
      next(error);
      return;
    }

    // Validate status if provided
    if (status && !Object.values(AppointmentStatus).includes(status)) {
      const error = createValidationError("Invalid status");
      next(error);
      return;
    }

    const appointments = await getAppointmentsByDoctorId(doctorId, {
      status,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create appointment
 * POST /api/v1/appointments
 */
export async function createAppointmentSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const error = createValidationError("User not authenticated");
      next(error);
      return;
    }

    const {
      patientId,
      doctorId,
      availabilityId,
      slotId,
      startTime,
      endTime,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !patientId ||
      (typeof patientId === "string" && patientId.trim() === "")
    ) {
      const error = createValidationError("Patient ID is required");
      next(error);
      return;
    }

    // If slotId is provided, use slot-based booking (startTime/endTime not required)
    if (slotId) {
      // doctorId is still required for type safety, but service will use slot's doctorId
      if (!doctorId) {
        const error = createValidationError("Doctor ID is required");
        next(error);
        return;
      }

      // When slotId is provided, startTime/endTime are not required
      const input = {
        patientId,
        doctorId,
        slotId,
        notes,
      } as CreateAppointmentInput;

      const appointment = await createAppointment(input);

      res.status(201).json({
        success: true,
        data: appointment,
      });
      return;
    }

    // Legacy booking path requires doctorId, startTime, and endTime
    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    if (!startTime) {
      const error = createValidationError("Start time is required");
      next(error);
      return;
    }

    if (!endTime) {
      const error = createValidationError("End time is required");
      next(error);
      return;
    }

    // Parse dates
    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);

    // Validate date parsing
    if (isNaN(startTimeDate.getTime())) {
      const error = createValidationError("Invalid start time format");
      next(error);
      return;
    }

    if (isNaN(endTimeDate.getTime())) {
      const error = createValidationError("Invalid end time format");
      next(error);
      return;
    }

    const input: CreateAppointmentInput = {
      patientId,
      doctorId,
      availabilityId,
      startTime: startTimeDate,
      endTime: endTimeDate,
      notes,
    };

    const appointment = await createAppointment(input);

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update appointment
 * PUT /api/v1/appointments/:id
 */
export async function updateAppointmentSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const error = createValidationError("User not authenticated");
      next(error);
      return;
    }

    const { id } = req.params;
    const { startTime, endTime, status, notes } = req.body;

    if (!id) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    // Parse dates if provided
    const startTimeDate = startTime ? new Date(startTime) : undefined;
    const endTimeDate = endTime ? new Date(endTime) : undefined;

    // Validate date parsing
    if (startTime && isNaN(startTimeDate!.getTime())) {
      const error = createValidationError("Invalid start time format");
      next(error);
      return;
    }

    if (endTime && isNaN(endTimeDate!.getTime())) {
      const error = createValidationError("Invalid end time format");
      next(error);
      return;
    }

    // Validate status if provided
    if (status && !Object.values(AppointmentStatus).includes(status)) {
      const error = createValidationError("Invalid status");
      next(error);
      return;
    }

    const input: UpdateAppointmentInput = {
      ...(startTimeDate && { startTime: startTimeDate }),
      ...(endTimeDate && { endTime: endTimeDate }),
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    };

    const appointment = await updateAppointment(id, input);

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel appointment
 * POST /api/v1/appointments/:id/cancel
 * Applies role-based cancellation rules:
 * - Patients: Can cancel their own appointments at least 24 hours in advance
 * - Doctors: Can cancel appointments assigned to them at any time
 * - Admins: Can cancel any appointment at any time
 */
export async function cancelAppointmentSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const error = createValidationError("User not authenticated");
      next(error);
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    // Validate user role - ensure it's one of the valid roles
    const userRole = req.user.role;
    const validRoles: UserRole[] = [
      UserRole.PATIENT,
      UserRole.DOCTOR,
      UserRole.ADMIN,
    ];
    if (!validRoles.includes(userRole)) {
      const error = createValidationError("Invalid user role");
      next(error);
      return;
    }

    // Type assertion is safe here because we've validated the role above
    // CancelAppointmentInput expects string literals, but UserRole enum values match
    const input: CancelAppointmentInput = {
      appointmentId: id,
      userId: req.user.id,
      userRole: userRole as "PATIENT" | "DOCTOR" | "ADMIN",
      reason,
    };

    const appointment = await cancelAppointment(input);

    res.status(200).json({
      success: true,
      data: appointment,
      message: "Appointment cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
}
