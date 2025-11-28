/**
 * Doctor controller
 * Handles HTTP requests for doctor endpoints
 */

import { Request, Response, NextFunction } from "express";
import {
  getDoctorById,
  getDoctorByUserId,
  getAllDoctors,
  createDoctor,
  updateDoctor,
} from "../services/doctor.service";
import { CreateDoctorInput, UpdateDoctorInput } from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Get all doctors with optional pagination and search
 * GET /api/v1/doctors
 */
export async function getDoctors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 10;
    const search = req.query.search as string | undefined;
    const specialization = req.query.specialization as string | undefined;

    // Validate pagination parameters
    if (page < 1) {
      const error = createValidationError("Page must be greater than 0");
      next(error);
      return;
    }

    if (limit < 1 || limit > 100) {
      const error = createValidationError("Limit must be between 1 and 100");
      next(error);
      return;
    }

    const result = await getAllDoctors({
      page,
      limit,
      search,
      specialization,
    });

    res.status(200).json({
      success: true,
      data: result.doctors,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get doctor by ID
 * GET /api/v1/doctors/:id
 */
export async function getDoctor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    const doctor = await getDoctorById(id);

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get doctor by user ID
 * GET /api/v1/doctors/user/:userId
 */
export async function getDoctorByUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    if (!userId) {
      const error = createValidationError("User ID is required");
      next(error);
      return;
    }

    const doctor = await getDoctorByUserId(userId);

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create doctor profile
 * POST /api/v1/doctors
 */
export async function registerDoctor(
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

    const { specialization, bio } = req.body;

    const input: CreateDoctorInput = {
      userId: req.user.id,
      specialization,
      bio,
    };

    const doctor = await createDoctor(input);

    res.status(201).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update doctor profile
 * PUT /api/v1/doctors/:id
 */
export async function updateDoctorProfile(
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
    const { specialization, bio } = req.body;

    if (!id) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Validate that at least one field is provided
    if (specialization === undefined && bio === undefined) {
      const error = createValidationError(
        "At least one field must be provided"
      );
      next(error);
      return;
    }

    const input: UpdateDoctorInput = {
      ...(specialization !== undefined && { specialization }),
      ...(bio !== undefined && { bio }),
    };

    const doctor = await updateDoctor(id, input);

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
}
