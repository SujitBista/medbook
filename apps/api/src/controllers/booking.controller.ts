/**
 * Capacity-based booking controller
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";
import { startBooking } from "../services/booking.service";

/**
 * POST /api/v1/bookings/start
 * Start a capacity booking: create PENDING_PAYMENT appointment + PaymentIntent
 * Body: { scheduleId }
 * Returns: { clientSecret, appointmentId }
 */
export async function startBookingHandler(
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

    const { scheduleId } = req.body;
    if (!scheduleId || typeof scheduleId !== "string") {
      const error = createValidationError("scheduleId is required");
      next(error);
      return;
    }

    const patientId = req.user.id;
    const result = await startBooking(scheduleId, patientId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
