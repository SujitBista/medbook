/**
 * Payment controller
 * Handles HTTP requests for payment processing
 */

import { Response, NextFunction } from "express";
import {
  createPaymentIntentForAppointment,
  createPayment,
  confirmPayment,
  getPaymentByAppointmentId,
  getPaymentById,
  processPaymentRefund,
} from "../services/payment.service";
import {
  CreatePaymentIntentInput,
  CreatePaymentInput,
  ConfirmPaymentInput,
  ProcessRefundInput,
} from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Create a payment intent for an appointment
 * POST /api/v1/payments/create-intent
 */
export async function createPaymentIntent(
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

    const { amount, currency, appointmentId, patientId, doctorId, metadata } =
      req.body;

    if (!amount || amount <= 0) {
      const error = createValidationError(
        "Payment amount is required and must be greater than 0"
      );
      next(error);
      return;
    }

    if (!appointmentId) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    if (!patientId) {
      const error = createValidationError("Patient ID is required");
      next(error);
      return;
    }

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Ensure patient can only create payment intents for themselves
    if (req.user.role !== "ADMIN" && req.user.id !== patientId) {
      const error = createValidationError(
        "You can only create payment intents for yourself"
      );
      next(error);
      return;
    }

    const input: CreatePaymentIntentInput = {
      amount: Math.round(Number(amount) * 100), // Convert to cents
      currency: currency || "usd",
      appointmentId,
      patientId,
      doctorId,
      metadata,
    };

    const result = await createPaymentIntentForAppointment(input);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a payment record after payment intent is created
 * POST /api/v1/payments
 */
export async function createPaymentRecord(
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

    const { appointmentId, patientId, doctorId, amount, currency, metadata } =
      req.body;

    if (!appointmentId) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    if (!patientId) {
      const error = createValidationError("Patient ID is required");
      next(error);
      return;
    }

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    if (!amount || amount <= 0) {
      const error = createValidationError(
        "Payment amount is required and must be greater than 0"
      );
      next(error);
      return;
    }

    // Ensure patient can only create payments for themselves
    if (req.user.role !== "ADMIN" && req.user.id !== patientId) {
      const error = createValidationError(
        "You can only create payments for yourself"
      );
      next(error);
      return;
    }

    const input: CreatePaymentInput = {
      appointmentId,
      patientId,
      doctorId,
      amount: Number(amount),
      currency: currency || "usd",
      metadata,
    };

    const payment = await createPayment(input);

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirm a payment after booking
 * POST /api/v1/payments/confirm
 */
export async function confirmPaymentHandler(
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

    const { paymentIntentId, appointmentId } = req.body;

    if (!paymentIntentId) {
      const error = createValidationError("Payment intent ID is required");
      next(error);
      return;
    }

    if (!appointmentId) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    const input: ConfirmPaymentInput = {
      paymentIntentId,
      appointmentId,
    };

    const payment = await confirmPayment(input);

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment by appointment ID
 * GET /api/v1/payments/appointment/:appointmentId
 */
export async function getPaymentByAppointment(
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

    const { appointmentId } = req.params;

    if (!appointmentId) {
      const error = createValidationError("Appointment ID is required");
      next(error);
      return;
    }

    const payment = await getPaymentByAppointmentId(appointmentId);

    if (!payment) {
      const error = createValidationError(
        "Payment not found for this appointment"
      );
      next(error);
      return;
    }

    // Check authorization: user must be admin, patient, or doctor for this appointment
    if (
      req.user.role !== "ADMIN" &&
      payment.patientId !== req.user.id &&
      payment.doctorId !== req.user.id
    ) {
      const error = createValidationError("Unauthorized to view this payment");
      next(error);
      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment by ID
 * GET /api/v1/payments/:id
 */
export async function getPayment(
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

    if (!id) {
      const error = createValidationError("Payment ID is required");
      next(error);
      return;
    }

    const payment = await getPaymentById(id);

    // Check authorization: user must be admin, patient, or doctor for this payment
    if (
      req.user.role !== "ADMIN" &&
      payment.patientId !== req.user.id &&
      payment.doctorId !== req.user.id
    ) {
      const error = createValidationError("Unauthorized to view this payment");
      next(error);
      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process a refund for a payment
 * POST /api/v1/payments/:id/refund
 */
export async function processRefund(
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

    // Only admins can process refunds
    if (req.user.role !== "ADMIN") {
      const error = createValidationError("Only admins can process refunds");
      next(error);
      return;
    }

    const { id } = req.params;
    const { reason, amount } = req.body;

    if (!id) {
      const error = createValidationError("Payment ID is required");
      next(error);
      return;
    }

    const input: ProcessRefundInput = {
      paymentId: id,
      reason,
      amount: amount ? Number(amount) : undefined,
    };

    const payment = await processPaymentRefund(input);

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}
