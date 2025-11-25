/**
 * Authentication routes
 * Handles user registration and login endpoints
 */

import { Router, type IRouter } from "express";
import { register, login } from "../controllers/auth.controller";

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

export default router;
