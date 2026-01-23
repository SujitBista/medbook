/**
 * Payment routes
 * Handles payment processing endpoints
 * All routes require authentication
 */

import { Router, type IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  createPaymentIntent,
  createPaymentRecord,
  confirmPaymentHandler,
  getPaymentByAppointment,
  getPayment,
  processRefund,
} from "../controllers/payment.controller";

const router: IRouter = Router();

// All payment routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/payments/create-intent
 * Create a payment intent for an appointment
 */
router.post("/create-intent", createPaymentIntent);

/**
 * POST /api/v1/payments
 * Create a payment record
 */
router.post("/", createPaymentRecord);

/**
 * POST /api/v1/payments/confirm
 * Confirm a payment after booking
 */
router.post("/confirm", confirmPaymentHandler);

/**
 * GET /api/v1/payments/appointment/:appointmentId
 * Get payment by appointment ID
 */
router.get("/appointment/:appointmentId", getPaymentByAppointment);

/**
 * GET /api/v1/payments/:id
 * Get payment by ID
 */
router.get("/:id", getPayment);

/**
 * POST /api/v1/payments/:id/refund
 * Process a refund for a payment (admin only)
 */
router.post("/:id/refund", processRefund);

export default router;
