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
  rescheduleAppointment,
} from "../services/appointment.service";
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentStatus,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  UserRole,
} from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";
import { getCommissionSettingsByDoctorId } from "../services/commission.service";
import { query } from "@app/db";

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
      paymentIntentId,
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

    // Check if payment is required for this doctor
    const commissionSettings = await getCommissionSettingsByDoctorId(doctorId);
    const appointmentPrice = commissionSettings?.appointmentPrice ?? 0;
    const requiresPayment = appointmentPrice > 0;

    // If payment is required, verify payment intent is provided and valid
    if (requiresPayment) {
      if (!paymentIntentId) {
        const error = createValidationError(
          "Payment is required. Please complete payment before booking."
        );
        next(error);
        return;
      }

      // Verify payment exists and is confirmed, or create it if it doesn't exist
      try {
        let payment = await query<{
          id: string;
          appointmentId: string;
          patientId: string;
          doctorId: string;
          status: string;
        } | null>((prisma) =>
          prisma.payment.findUnique({
            where: { stripePaymentIntentId: paymentIntentId },
            select: {
              id: true,
              appointmentId: true,
              patientId: true,
              doctorId: true,
              status: true,
            },
          })
        );

        // If payment doesn't exist, create it from the payment intent
        if (!payment) {
          const { getPaymentIntent } = await import("../utils/stripe");
          const stripePaymentIntent = await getPaymentIntent(paymentIntentId);

          // Verify payment intent is confirmed
          if (
            stripePaymentIntent.status !== "succeeded" &&
            stripePaymentIntent.status !== "processing"
          ) {
            const error = createValidationError(
              "Payment is not confirmed. Please complete payment before booking."
            );
            next(error);
            return;
          }

          // Create payment record
          const newPayment = await query<{
            id: string;
            appointmentId: string;
            patientId: string;
            doctorId: string;
            status: string;
          }>((prisma) =>
            prisma.payment.create({
              data: {
                appointmentId: "", // Will be set after appointment creation
                patientId: patientId,
                doctorId: doctorId,
                amount: stripePaymentIntent.amount / 100, // Convert from cents
                currency: stripePaymentIntent.currency,
                status:
                  stripePaymentIntent.status === "succeeded"
                    ? "COMPLETED"
                    : stripePaymentIntent.status === "processing"
                      ? "PROCESSING"
                      : "PENDING",
                stripePaymentIntentId: paymentIntentId,
                stripeChargeId:
                  stripePaymentIntent.latest_charge &&
                  typeof stripePaymentIntent.latest_charge === "object"
                    ? stripePaymentIntent.latest_charge.id
                    : typeof stripePaymentIntent.latest_charge === "string"
                      ? stripePaymentIntent.latest_charge
                      : null,
                refundedAmount: 0,
                metadata: {},
              },
              select: {
                id: true,
                appointmentId: true,
                patientId: true,
                doctorId: true,
                status: true,
              },
            })
          );
          payment = newPayment;
        }

        // Verify payment matches patient and doctor
        if (payment.patientId !== patientId) {
          const error = createValidationError(
            "Payment does not match patient. Please use your own payment."
          );
          next(error);
          return;
        }

        if (payment.doctorId !== doctorId) {
          const error = createValidationError(
            "Payment does not match doctor. Please pay for the correct appointment."
          );
          next(error);
          return;
        }

        // Verify payment is confirmed (COMPLETED or PROCESSING)
        if (payment.status !== "COMPLETED" && payment.status !== "PROCESSING") {
          const error = createValidationError(
            "Payment is not confirmed. Please complete payment before booking."
          );
          next(error);
          return;
        }

        // Verify appointment hasn't been created yet (appointmentId should be empty or match)
        // If appointmentId exists and doesn't match, it means payment was already used
        if (payment.appointmentId && payment.appointmentId.trim() !== "") {
          // Allow if it's the same appointment (for idempotency)
          // But we're creating a new one, so this shouldn't happen
          const error = createValidationError(
            "Payment has already been used for another appointment."
          );
          next(error);
          return;
        }
      } catch (err) {
        console.error("[AppointmentController] Error validating payment:", err);
        const error = createValidationError(
          "Failed to validate payment. Please try again."
        );
        next(error);
        return;
      }
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

      // If payment was required and provided, update payment with appointment ID
      if (requiresPayment && paymentIntentId) {
        try {
          const { confirmPayment } = await import(
            "../services/payment.service"
          );
          await confirmPayment({
            paymentIntentId,
            appointmentId: appointment.id,
          });
        } catch (err) {
          console.error(
            "[AppointmentController] Error updating payment with appointment ID:",
            err
          );
          // Don't fail the appointment creation, but log the error
        }
      }

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

    // If payment was required and provided, update payment with appointment ID
    if (requiresPayment && paymentIntentId) {
      try {
        const { confirmPayment } = await import("../services/payment.service");
        await confirmPayment({
          paymentIntentId,
          appointmentId: appointment.id,
        });
      } catch (err) {
        console.error(
          "[AppointmentController] Error updating payment with appointment ID:",
          err
        );
        // Don't fail the appointment creation, but log the error
      }
    }

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

/**
 * Reschedule appointment
 * POST /api/v1/appointments/:id/reschedule
 * Reschedules an appointment to a new slot
 * - Frees the old slot
 * - Books the new slot
 * - Sends reschedule confirmation email
 */
export async function rescheduleAppointmentSlot(
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
    const { newSlotId, reason } = req.body;

    if (!id) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    if (!newSlotId) {
      const error = createValidationError("New slot ID is required");
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

    const input: RescheduleAppointmentInput = {
      appointmentId: id,
      newSlotId,
      userId: req.user.id,
      userRole: userRole as "PATIENT" | "DOCTOR" | "ADMIN",
      reason,
    };

    const appointment = await rescheduleAppointment(input);

    res.status(200).json({
      success: true,
      data: appointment,
      message: "Appointment rescheduled successfully",
    });
  } catch (error) {
    next(error);
  }
}
