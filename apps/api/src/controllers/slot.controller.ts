/**
 * Slot controller
 * Handles HTTP requests for slot endpoints
 */

import { Request, Response, NextFunction } from "express";
import {
  getSlotById,
  getSlotsByDoctorId,
  generateSlotsFromAvailability,
  blockSlot,
  unblockSlot,
  getSlotTemplate,
  upsertSlotTemplate,
  getOrCreateSlotTemplate,
} from "../services/slot.service";
import {
  CreateSlotTemplateInput,
  UpdateSlotTemplateInput,
  SlotStatus,
} from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Get slot by ID
 * GET /api/v1/slots/:id
 */
export async function getSlot(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Slot ID is required");
      next(error);
      return;
    }

    const slot = await getSlotById(id);

    res.status(200).json({
      success: true,
      slot,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get slots by doctor ID
 * GET /api/v1/slots/doctor/:doctorId
 */
export async function getSlotsByDoctor(
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
    const status = req.query.status as SlotStatus | undefined;

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
    if (status && !Object.values(SlotStatus).includes(status)) {
      const error = createValidationError("Invalid status");
      next(error);
      return;
    }

    const slots = await getSlotsByDoctorId(doctorId, {
      startDate,
      endDate,
      status,
    });

    res.status(200).json({
      success: true,
      slots,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate slots from availability
 * POST /api/v1/slots/generate
 */
export async function generateSlots(
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

    const { availabilityId, doctorId } = req.body;

    if (!availabilityId) {
      const error = createValidationError("Availability ID is required");
      next(error);
      return;
    }

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    const slots = await generateSlotsFromAvailability(availabilityId, doctorId);

    res.status(201).json({
      success: true,
      slots,
      count: slots.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Block a slot
 * POST /api/v1/slots/:id/block
 */
export async function blockSlotEndpoint(
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
    const { doctorId } = req.body;

    if (!id) {
      const error = createValidationError("Slot ID is required");
      next(error);
      return;
    }

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Verify user is the doctor
    // TODO: Add proper authorization check

    const slot = await blockSlot(id, doctorId);

    res.status(200).json({
      success: true,
      slot,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unblock a slot
 * DELETE /api/v1/slots/:id/block
 */
export async function unblockSlotEndpoint(
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
    const { doctorId } = req.body;

    if (!id) {
      const error = createValidationError("Slot ID is required");
      next(error);
      return;
    }

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Verify user is the doctor
    // TODO: Add proper authorization check

    const slot = await unblockSlot(id, doctorId);

    res.status(200).json({
      success: true,
      slot,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get slot template for a doctor
 * GET /api/v1/slots/template/:doctorId
 */
export async function getSlotTemplateEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    const template = await getOrCreateSlotTemplate(doctorId);

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create or update slot template
 * POST /api/v1/slots/template
 */
export async function upsertSlotTemplateEndpoint(
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

    const { doctorId, durationMinutes, bufferMinutes, advanceBookingDays } =
      req.body;

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Verify user is the doctor
    // TODO: Add proper authorization check

    const input: CreateSlotTemplateInput = {
      doctorId,
      durationMinutes,
      bufferMinutes,
      advanceBookingDays,
    };

    const template = await upsertSlotTemplate(input);

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
}
