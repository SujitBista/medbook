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
import { getOrCreateCommissionSettings } from "../services/commission.service";

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
    const city = req.query.city as string | undefined;
    const state = req.query.state as string | undefined;
    const sortBy = req.query.sortBy as
      | "name"
      | "specialization"
      | "yearsOfExperience"
      | "createdAt"
      | undefined;
    const sortOrder = req.query.sortOrder as "asc" | "desc" | undefined;
    // Default to true: only show doctors with availability (public endpoint)
    const hasAvailability =
      req.query.hasAvailability !== undefined
        ? req.query.hasAvailability === "true"
        : true;

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

    // Validate sortBy
    if (
      sortBy &&
      !["name", "specialization", "yearsOfExperience", "createdAt"].includes(
        sortBy
      )
    ) {
      const error = createValidationError(
        "sortBy must be one of: name, specialization, yearsOfExperience, createdAt"
      );
      next(error);
      return;
    }

    // Validate sortOrder
    if (sortOrder && !["asc", "desc"].includes(sortOrder)) {
      const error = createValidationError(
        "sortOrder must be either 'asc' or 'desc'"
      );
      next(error);
      return;
    }

    const result = await getAllDoctors({
      page,
      limit,
      search,
      specialization,
      hasAvailability,
      city,
      state,
      sortBy,
      sortOrder,
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
 * Get appointment price for a doctor (public endpoint)
 * GET /api/v1/doctors/:id/price
 */
export async function getDoctorPrice(
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

    // Verify doctor exists
    await getDoctorById(id);

    // Get or create commission settings (returns default if not set)
    const settings = await getOrCreateCommissionSettings(id);

    res.status(200).json({
      success: true,
      data: {
        appointmentPrice: settings.appointmentPrice,
      },
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
    const {
      specialization,
      bio,
      licenseNumber,
      address,
      city,
      state,
      zipCode,
      yearsOfExperience,
      education,
      profilePictureUrl,
    } = req.body;

    if (!id) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Validate that at least one field is provided
    const hasAnyField =
      specialization !== undefined ||
      bio !== undefined ||
      licenseNumber !== undefined ||
      address !== undefined ||
      city !== undefined ||
      state !== undefined ||
      zipCode !== undefined ||
      yearsOfExperience !== undefined ||
      education !== undefined ||
      profilePictureUrl !== undefined;

    if (!hasAnyField) {
      const error = createValidationError(
        "At least one field must be provided"
      );
      next(error);
      return;
    }

    const input: UpdateDoctorInput = {
      ...(specialization !== undefined && { specialization }),
      ...(bio !== undefined && { bio }),
      ...(licenseNumber !== undefined && { licenseNumber }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(yearsOfExperience !== undefined && { yearsOfExperience }),
      ...(education !== undefined && { education }),
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
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
