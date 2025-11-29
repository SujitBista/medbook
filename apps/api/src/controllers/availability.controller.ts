/**
 * Availability controller
 * Handles HTTP requests for availability endpoints
 */

import { Request, Response, NextFunction } from "express";
import {
  getAvailabilityById,
  getAvailabilitiesByDoctorId,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "../services/availability.service";
import {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Get availability by ID
 * GET /api/v1/availability/:id
 */
export async function getAvailability(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Availability ID is required");
      next(error);
      return;
    }

    const availability = await getAvailabilityById(id);

    res.status(200).json({
      success: true,
      availability,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get availabilities by doctor ID
 * GET /api/v1/availability/doctor/:doctorId
 */
export async function getAvailabilitiesByDoctor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;
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

    const availabilities = await getAvailabilitiesByDoctorId(doctorId, {
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      availabilities,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create availability
 * POST /api/v1/availability
 */
export async function createAvailabilitySlot(
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
      doctorId,
      startTime,
      endTime,
      dayOfWeek,
      isRecurring,
      validFrom,
      validTo,
    } = req.body;

    // Validate required fields
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
    const validFromDate = validFrom ? new Date(validFrom) : undefined;
    const validToDate = validTo ? new Date(validTo) : undefined;

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

    if (validFromDate && isNaN(validFromDate.getTime())) {
      const error = createValidationError("Invalid validFrom format");
      next(error);
      return;
    }

    if (validToDate && isNaN(validToDate.getTime())) {
      const error = createValidationError("Invalid validTo format");
      next(error);
      return;
    }

    const input: CreateAvailabilityInput = {
      doctorId,
      startTime: startTimeDate,
      endTime: endTimeDate,
      dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : undefined,
      isRecurring,
      validFrom: validFromDate,
      validTo: validToDate,
    };

    const availability = await createAvailability(input);

    res.status(201).json({
      success: true,
      availability,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update availability
 * PUT /api/v1/availability/:id
 */
export async function updateAvailabilitySlot(
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
    const { startTime, endTime, dayOfWeek, isRecurring, validFrom, validTo } =
      req.body;

    if (!id) {
      const error = createValidationError("Availability ID is required");
      next(error);
      return;
    }

    // Validate that at least one field is provided
    if (
      startTime === undefined &&
      endTime === undefined &&
      dayOfWeek === undefined &&
      isRecurring === undefined &&
      validFrom === undefined &&
      validTo === undefined
    ) {
      const error = createValidationError(
        "At least one field must be provided"
      );
      next(error);
      return;
    }

    // Parse dates if provided
    const startTimeDate = startTime ? new Date(startTime) : undefined;
    const endTimeDate = endTime ? new Date(endTime) : undefined;
    const validFromDate = validFrom ? new Date(validFrom) : undefined;
    const validToDate = validTo ? new Date(validTo) : undefined;

    // Validate date parsing
    if (startTimeDate && isNaN(startTimeDate.getTime())) {
      const error = createValidationError("Invalid start time format");
      next(error);
      return;
    }

    if (endTimeDate && isNaN(endTimeDate.getTime())) {
      const error = createValidationError("Invalid end time format");
      next(error);
      return;
    }

    if (validFromDate && isNaN(validFromDate.getTime())) {
      const error = createValidationError("Invalid validFrom format");
      next(error);
      return;
    }

    if (validToDate && isNaN(validToDate.getTime())) {
      const error = createValidationError("Invalid validTo format");
      next(error);
      return;
    }

    const input: UpdateAvailabilityInput = {
      ...(startTimeDate !== undefined && { startTime: startTimeDate }),
      ...(endTimeDate !== undefined && { endTime: endTimeDate }),
      ...(dayOfWeek !== undefined && {
        dayOfWeek: parseInt(dayOfWeek, 10),
      }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(validFromDate !== undefined && { validFrom: validFromDate }),
      ...(validToDate !== undefined && { validTo: validToDate }),
    };

    const availability = await updateAvailability(id, input);

    res.status(200).json({
      success: true,
      availability,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete availability
 * DELETE /api/v1/availability/:id
 */
export async function deleteAvailabilitySlot(
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
      const error = createValidationError("Availability ID is required");
      next(error);
      return;
    }

    await deleteAvailability(id);

    res.status(200).json({
      success: true,
      message: "Availability deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
