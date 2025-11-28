/**
 * Admin controller
 * Handles HTTP requests for admin-only endpoints
 */

import { Request, Response, NextFunction } from "express";
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
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";
import { UserRole } from "@medbook/types";

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

    const { email, password, specialization, bio } = req.body;

    // Validate required fields
    const fieldErrors: Record<string, string> = {};
    if (!email) {
      fieldErrors.email = "Email is required";
    }
    if (!password) {
      fieldErrors.password = "Password is required";
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
      specialization,
      bio,
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
