/**
 * Commission controller
 * Handles HTTP requests for commission management
 */

import { Response, NextFunction } from "express";
import {
  getCommissionById,
  getCommissionsByDoctorId,
  getCommissionStats,
} from "../services/commission.service";
import { CommissionStatus } from "@medbook/types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createValidationError, createNotFoundError } from "../utils";

/**
 * Get commissions for a doctor
 * GET /api/v1/commissions/doctor/:doctorId
 */
export async function getCommissionsByDoctor(
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

    const { doctorId } = req.params;
    const { status, startDate, endDate } = req.query;

    if (!doctorId) {
      const error = createValidationError("Doctor ID is required");
      next(error);
      return;
    }

    // Doctors can only view their own commissions
    // Admins can view any doctor's commissions
    if (req.user.role !== "ADMIN" && req.user.id !== doctorId) {
      const error = createValidationError(
        "You can only view your own commissions"
      );
      next(error);
      return;
    }

    const filters: {
      status?: CommissionStatus;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (status) {
      const validStatuses: CommissionStatus[] = [
        CommissionStatus.PENDING,
        CommissionStatus.PAID,
        CommissionStatus.CANCELLED,
      ];
      if (validStatuses.includes(status as CommissionStatus)) {
        filters.status = status as CommissionStatus;
      }
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    const commissions = await getCommissionsByDoctorId(doctorId, filters);

    res.status(200).json({
      success: true,
      data: commissions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get commission by ID
 * GET /api/v1/commissions/:id
 */
export async function getCommission(
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
      const error = createValidationError("Commission ID is required");
      next(error);
      return;
    }

    const commission = await getCommissionById(id);

    if (!commission) {
      const error = createNotFoundError("Commission");
      next(error);
      return;
    }

    // Doctors can only view their own commissions
    // Admins can view any commission
    if (req.user.role !== "ADMIN" && commission.doctorId !== req.user.id) {
      const error = createValidationError(
        "Unauthorized to view this commission"
      );
      next(error);
      return;
    }

    res.status(200).json({
      success: true,
      data: commission,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get commission statistics
 * GET /api/v1/commissions/stats
 */
export async function getCommissionStatistics(
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

    const { doctorId } = req.query;

    // If doctorId is provided and user is not admin, ensure they can only view their own stats
    if (doctorId && req.user.role !== "ADMIN") {
      if (req.user.id !== doctorId) {
        const error = createValidationError(
          "You can only view your own commission statistics"
        );
        next(error);
        return;
      }
    }

    // If no doctorId and user is not admin, use their own ID
    const filterDoctorId =
      req.user.role === "ADMIN"
        ? (doctorId as string | undefined)
        : req.user.id;

    const stats = await getCommissionStats(filterDoctorId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
