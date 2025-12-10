/**
 * Admin controller
 * Handles HTTP requests for admin-only endpoints
 */

import { Response, NextFunction } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getSystemStats,
  createDoctorUser,
  UpdateUserRoleInput,
  CreateDoctorUserInput,
} from "../services/admin.service";
import {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getDoctorStats,
} from "../services/doctor.service";
import { UpdateDoctorInput } from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Get all users (admin only)
 * GET /api/v1/admin/users
 */
export async function listUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await getAllUsers();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID (admin only)
 * GET /api/v1/admin/users/:id
 */
export async function getUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      const error = createValidationError("User ID is required");
      next(error);
      return;
    }

    const user = await getUserById(id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user role (admin only)
 * PUT /api/v1/admin/users/:id/role
 */
export async function updateRole(
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
    const { role } = req.body;

    if (!id) {
      const error = createValidationError("User ID is required");
      next(error);
      return;
    }

    if (!role) {
      const error = createValidationError("Role is required");
      next(error);
      return;
    }

    // Prevent admin from changing their own role
    if (req.user.id === id) {
      const error = createValidationError("You cannot change your own role");
      next(error);
      return;
    }

    const input: UpdateUserRoleInput = {
      role,
    };

    const user = await updateUserRole(id, input);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete user (admin only)
 * DELETE /api/v1/admin/users/:id
 */
export async function removeUser(
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
      const error = createValidationError("User ID is required");
      next(error);
      return;
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      const error = createValidationError("You cannot delete your own account");
      next(error);
      return;
    }

    await deleteUser(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get system statistics (admin only)
 * GET /api/v1/admin/stats
 */
export async function getStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getSystemStats();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a new doctor user (admin only)
 * POST /api/v1/admin/doctors
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

    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
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

    // Validate required fields
    const fieldErrors: Record<string, string> = {};
    if (!email) {
      fieldErrors.email = "Email is required";
    }
    if (!password) {
      fieldErrors.password = "Password is required";
    }
    if (!firstName || !firstName.trim()) {
      fieldErrors.firstName = "First name is required";
    }
    if (!lastName || !lastName.trim()) {
      fieldErrors.lastName = "Last name is required";
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      fieldErrors.phoneNumber = "Phone number is required";
    }

    if (Object.keys(fieldErrors).length > 0) {
      const error = createValidationError(
        "Please fill in all required fields",
        {
          errors: fieldErrors,
        }
      );
      next(error);
      return;
    }

    const input: CreateDoctorUserInput = {
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
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
    };

    const result = await createDoctorUser(input);

    res.status(201).json({
      success: true,
      user: result.user,
      doctor: result.doctor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all doctors (admin only)
 * GET /api/v1/admin/doctors
 */
export async function listDoctors(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 100; // Admin can see more doctors at once
    const search = req.query.search as string | undefined;
    const specialization = req.query.specialization as string | undefined;

    // Validate pagination parameters
    if (page < 1) {
      const error = createValidationError("Page must be greater than 0");
      next(error);
      return;
    }

    if (limit < 1 || limit > 1000) {
      const error = createValidationError("Limit must be between 1 and 1000");
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
 * Get doctor by ID (admin only)
 * GET /api/v1/admin/doctors/:id
 */
export async function getDoctor(
  req: AuthenticatedRequest,
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
 * Update doctor profile (admin only)
 * PUT /api/v1/admin/doctors/:id
 */
export async function updateDoctorProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
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

/**
 * Delete doctor (admin only)
 * DELETE /api/v1/admin/doctors/:id
 */
export async function removeDoctor(
  req: AuthenticatedRequest,
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

    await deleteDoctor(id);

    res.status(200).json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get doctor statistics (admin only)
 * GET /api/v1/admin/doctors/stats
 */
export async function getDoctorStatistics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getDoctorStats();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
}
