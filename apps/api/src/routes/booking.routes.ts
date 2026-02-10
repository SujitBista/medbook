/**
 * Capacity-based booking routes
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { startBookingHandler } from "../controllers/booking.controller";

const router: IRouter = Router();

/**
 * POST /api/v1/bookings/start
 * Start booking (create PENDING_PAYMENT + PaymentIntent)
 * Body: { scheduleId }
 */
router.post("/start", authenticate, startBookingHandler);

export default router;
