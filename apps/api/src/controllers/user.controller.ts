/**
 * User controller
 * Handles HTTP requests for user profile endpoints
 */

import { Request, Response, NextFunction } from "express";
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  UpdateUserProfileInput,
  ChangePasswordInput,
} from "../services/user.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError } from "../utils";

/**
 * Get current user profile
 * GET /api/v1/users/profile
 */
export async function getProfile(
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

    const user = await getUserProfile(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update current user profile
 * PUT /api/v1/users/profile
 */
export async function updateProfile(
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

    const { email } = req.body;

    // Validate that at least one field is provided
    if (!email) {
      const error = createValidationError(
        "At least one field must be provided"
      );
      next(error);
      return;
    }

    const input: UpdateUserProfileInput = {
      email,
    };

    const user = await updateUserProfile(req.user.id, input);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change user password
 * PUT /api/v1/users/password
 */
export async function changePassword(
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

    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      const error = createValidationError(
        "Current password and new password are required"
      );
      next(error);
      return;
    }

    // Validate that new password is different from current password
    if (currentPassword === newPassword) {
      const error = createValidationError(
        "New password must be different from current password"
      );
      next(error);
      return;
    }

    const input: ChangePasswordInput = {
      currentPassword,
      newPassword,
    };

    await changeUserPassword(req.user.id, input);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
}
