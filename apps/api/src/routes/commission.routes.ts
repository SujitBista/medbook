/**
 * Commission routes
 * Handles commission management endpoints
 * All routes require authentication
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getCommissionsByDoctor,
  getCommission,
  getCommissionStatistics,
} from "../controllers/commission.controller";

const router: IRouter = Router();

// All commission routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/commissions/doctor/:doctorId
 * Get commissions for a doctor
 */
router.get("/doctor/:doctorId", getCommissionsByDoctor);

/**
 * GET /api/v1/commissions/stats
 * Get commission statistics
 */
router.get("/stats", getCommissionStatistics);

/**
 * GET /api/v1/commissions/:id
 * Get commission by ID
 */
router.get("/:id", getCommission);

export default router;
