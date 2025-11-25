/**
 * User routes
 * Handles user profile management endpoints
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/user.controller";

const router: IRouter = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/users/profile
 * Get current user profile
 */
router.get("/profile", getProfile);

/**
 * PUT /api/v1/users/profile
 * Update current user profile
 */
router.put("/profile", updateProfile);

/**
 * PUT /api/v1/users/password
 * Change user password
 */
router.put("/password", changePassword);

export default router;
