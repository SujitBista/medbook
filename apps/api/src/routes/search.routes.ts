/**
 * Search routes
 * Public endpoints for search suggestions
 */

import { Router, type IRouter } from "express";
import { getSuggestions } from "../controllers/search.controller";

const router: IRouter = Router();

/**
 * GET /api/v1/search/suggestions?q=<text>
 * Returns { departments: [{ label, slug }], doctors: [{ id, name, department }] }
 */
router.get("/suggestions", getSuggestions);

export default router;
