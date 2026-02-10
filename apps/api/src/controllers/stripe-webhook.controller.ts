/**
 * Stripe webhook controller
 * Handles payment_intent.succeeded (token assignment) and payment_intent.payment_failed / canceled
 * Uses raw body for signature verification (must be mounted with express.raw())
 */

import { Request, Response } from "express";
import Stripe from "stripe";
import { getStripeClient } from "../config/stripe";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { withTransaction } from "@app/db";

type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Handle payment_intent.succeeded: assign queue number or mark OVERFLOW
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const paymentIntentId = paymentIntent.id;
  const metadata = paymentIntent.metadata || {};
  const scheduleId = metadata.scheduleId as string | undefined;

  if (!scheduleId) {
    logger.warn("Stripe webhook: payment_intent.succeeded missing scheduleId", {
      event: "stripe-webhook",
      paymentIntentId,
    });
    return;
  }

  const appointment = await withTransaction(async (tx) => {
    const app = await tx.appointment.findUnique({
      where: { paymentIntentId },
      select: {
        id: true,
        scheduleId: true,
        status: true,
      },
    });
    if (!app) {
      logger.warn("Stripe webhook: no appointment for paymentIntentId", {
        event: "stripe-webhook",
        paymentIntentId,
      });
      return null;
    }
    if (app.status !== "PENDING_PAYMENT") {
      logger.info("Stripe webhook: appointment already processed", {
        event: "stripe-webhook",
        appointmentId: app.id,
        status: app.status,
      });
      return null;
    }

    const schedule = await tx.schedule.findUnique({
      where: { id: scheduleId },
      select: { maxPatients: true },
    });
    if (!schedule) {
      logger.error("Stripe webhook: schedule not found", {
        event: "stripe-webhook",
        scheduleId,
      });
      return null;
    }

    const confirmedCount = await tx.appointment.count({
      where: {
        scheduleId,
        status: "CONFIRMED",
      },
    });

    if (confirmedCount >= schedule.maxPatients) {
      await tx.appointment.update({
        where: { id: app.id },
        data: {
          status: "OVERFLOW",
          paymentStatus: "PAID",
          paidAt: new Date(),
        },
      });
      logger.warn("OVERFLOW_AFTER_PAYMENT", {
        event: "overflow",
        scheduleId,
        appointmentId: app.id,
        confirmedCount,
        maxPatients: schedule.maxPatients,
      });
      return { id: app.id, status: "OVERFLOW" as const };
    }

    const queueNumber = confirmedCount + 1;
    await tx.appointment.update({
      where: { id: app.id },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paidAt: new Date(),
        queueNumber,
      },
    });
    logger.info("Token assigned", {
      event: "token-assign",
      appointmentId: app.id,
      scheduleId,
      queueNumber,
    });
    return { id: app.id, status: "CONFIRMED" as const, queueNumber };
  });

  if (appointment) {
    logger.info("Stripe webhook: payment_intent.succeeded processed", {
      event: "stripe-webhook",
      paymentIntentId,
      appointmentId: appointment.id,
      status: appointment.status,
    });
  }
}

/**
 * Handle payment_intent.payment_failed or canceled: mark appointment CANCELLED
 */
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const paymentIntentId = paymentIntent.id;
  const updated = await withTransaction(async (tx) => {
    const app = await tx.appointment.findUnique({
      where: { paymentIntentId, status: "PENDING_PAYMENT" },
      select: { id: true },
    });
    if (!app) return null;
    await tx.appointment.update({
      where: { id: app.id },
      data: { status: "CANCELLED", paymentStatus: "UNPAID" },
    });
    return app.id;
  });
  if (updated) {
    logger.info("Stripe webhook: appointment cancelled (payment failed)", {
      event: "stripe-webhook",
      paymentIntentId,
      appointmentId: updated,
    });
  }
}

/**
 * POST /api/v1/webhooks/stripe
 * Stripe webhook (must be mounted with express.raw({ type: 'application/json' }))
 */
export async function stripeWebhookHandler(
  req: RawBodyRequest,
  res: Response
): Promise<void> {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = env.stripeWebhookSecret;

  if (!webhookSecret || !sig) {
    logger.warn("Stripe webhook: missing secret or signature");
    res.status(400).send("Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
    return;
  }

  const rawBody = req.rawBody ?? req.body;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    logger.warn("Stripe webhook: raw body required");
    res.status(400).send("Webhook must receive raw body");
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Stripe webhook signature verification failed", {
      event: "stripe-webhook",
      error: msg,
    });
    res.status(400).send(`Webhook Error: ${msg}`);
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }
      default:
        logger.debug("Stripe webhook: unhandled event type", {
          event: "stripe-webhook",
          type: event.type,
        });
    }
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook handler error", {
      event: "stripe-webhook",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).send("Webhook handler failed");
  }
}
