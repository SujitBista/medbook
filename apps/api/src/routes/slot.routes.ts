/**
 * Slot routes
 * Handles slot management endpoints
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getSlot,
  getSlotsByDoctor,
  generateSlots,
  blockSlotEndpoint,
  unblockSlotEndpoint,
  deleteSlotEndpoint,
  getSlotTemplateEndpoint,
  upsertSlotTemplateEndpoint,
} from "../controllers/slot.controller";

const router: IRouter = Router();

/**
 * GET /api/v1/slots/:id
 * Get slot by ID (public, no auth required)
 */
router.get("/:id", getSlot);

/**
 * GET /api/v1/slots/doctor/:doctorId
 * Get slots by doctor ID (public, no auth required)
 * Query params: startDate, endDate, status (optional)
 */
router.get("/doctor/:doctorId", getSlotsByDoctor);

/**
 * GET /api/v1/slots/template/:doctorId
 * Get slot template for a doctor (public, no auth required)
 */
router.get("/template/:doctorId", getSlotTemplateEndpoint);

// Routes below require authentication
router.use(authenticate);

/**
 * POST /api/v1/slots/generate
 * Generate slots from availability (requires authentication)
 */
router.post("/generate", generateSlots);

/**
 * POST /api/v1/slots/template
 * Create or update slot template (requires authentication)
 */
router.post("/template", upsertSlotTemplateEndpoint);

/**
 * POST /api/v1/slots/:id/block
 * Block a slot (requires authentication)
 */
router.post("/:id/block", blockSlotEndpoint);

/**
 * DELETE /api/v1/slots/:id/block
 * Unblock a slot (requires authentication)
 */
router.delete("/:id/block", unblockSlotEndpoint);

/**
 * DELETE /api/v1/slots/:id
 * Delete a slot (requires authentication)
 * Will fail if there are non-cancelled appointments for this slot
 */
router.delete("/:id", deleteSlotEndpoint);

export default router;
