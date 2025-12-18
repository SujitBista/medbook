/**
 * Authentication routes
 * Handles user registration and login endpoints
 */

import { Router, type IRouter } from "express";
import { register, login, logout } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router: IRouter = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post("/register", register);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post("/login", login);

/**
 * POST /api/v1/auth/logout
 * Logout user (client should clear stored tokens/session)
 * Requires a valid authentication token
 */
router.post("/logout", authenticate, logout);

export default router;
