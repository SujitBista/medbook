/**
 * Stripe utility functions
 * Helper functions for common Stripe operations
 */

import Stripe from "stripe";
import { getStripeClient } from "../config/stripe";
import { logger } from "./logger";

/**
 * Create a payment intent for an appointment
 * @param amount Amount in cents (e.g., 10000 for $100.00)
 * @param currency Currency code (default: "usd")
 * @param metadata Additional metadata to attach to the payment intent
 * @returns Payment intent with client secret
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = "usd",
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logger.info("Payment intent created", {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
    });

    return paymentIntent;
  } catch (error) {
    logger.error("Failed to create payment intent", {
      error: error instanceof Error ? error.message : String(error),
      amount,
      currency,
    });
    throw error;
  }
}

/**
 * Confirm a payment intent
 * @param paymentIntentId Payment intent ID
 * @returns Confirmed payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return paymentIntent;
    }

    // If not already succeeded, confirm it
    const confirmed = await stripe.paymentIntents.confirm(paymentIntentId);

    logger.info("Payment intent confirmed", {
      paymentIntentId: confirmed.id,
      status: confirmed.status,
    });

    return confirmed;
  } catch (error) {
    logger.error("Failed to confirm payment intent", {
      error: error instanceof Error ? error.message : String(error),
      paymentIntentId,
    });
    throw error;
  }
}

/**
 * Process a full refund for a payment
 * @param chargeId Stripe charge ID
 * @param reason Reason for refund
 * @returns Refund object
 */
export async function processRefund(
  chargeId: string,
  reason?: string
): Promise<Stripe.Refund> {
  const stripe = getStripeClient();

  try {
    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason: reason ? (reason as Stripe.RefundCreateParams.Reason) : undefined,
    });

    logger.info("Refund processed", {
      refundId: refund.id,
      chargeId,
      amount: refund.amount,
      reason,
    });

    return refund;
  } catch (error) {
    logger.error("Failed to process refund", {
      error: error instanceof Error ? error.message : String(error),
      chargeId,
      reason,
    });
    throw error;
  }
}

/**
 * Process a partial refund for a payment
 * @param chargeId Stripe charge ID
 * @param amount Amount to refund in cents
 * @param reason Reason for refund
 * @returns Refund object
 */
export async function processPartialRefund(
  chargeId: string,
  amount: number,
  reason?: string
): Promise<Stripe.Refund> {
  const stripe = getStripeClient();

  try {
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount,
      reason: reason ? (reason as Stripe.RefundCreateParams.Reason) : undefined,
    });

    logger.info("Partial refund processed", {
      refundId: refund.id,
      chargeId,
      amount: refund.amount,
      reason,
    });

    return refund;
  } catch (error) {
    logger.error("Failed to process partial refund", {
      error: error instanceof Error ? error.message : String(error),
      chargeId,
      amount,
      reason,
    });
    throw error;
  }
}

/**
 * Create a Stripe Connect account for a doctor (for payouts)
 * @param email Doctor's email
 * @param country Country code (default: "us")
 * @returns Connected account
 */
export async function createConnectedAccount(
  email: string,
  country: string = "us"
): Promise<Stripe.Account> {
  const stripe = getStripeClient();

  try {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    logger.info("Stripe Connect account created", {
      accountId: account.id,
      email,
      country,
    });

    return account;
  } catch (error) {
    logger.error("Failed to create Stripe Connect account", {
      error: error instanceof Error ? error.message : String(error),
      email,
      country,
    });
    throw error;
  }
}

/**
 * Create a transfer to a connected account (doctor payout)
 * @param amount Amount to transfer in cents
 * @param destination Connected account ID
 * @param metadata Additional metadata
 * @returns Transfer object
 */
export async function createTransfer(
  amount: number,
  destination: string,
  metadata?: Record<string, string>
): Promise<Stripe.Transfer> {
  const stripe = getStripeClient();

  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency: "usd",
      destination,
      metadata: metadata || {},
    });

    logger.info("Transfer created", {
      transferId: transfer.id,
      amount,
      destination,
    });

    return transfer;
  } catch (error) {
    logger.error("Failed to create transfer", {
      error: error instanceof Error ? error.message : String(error),
      amount,
      destination,
    });
    throw error;
  }
}

/**
 * Retrieve a payment intent by ID
 * @param paymentIntentId Payment intent ID
 * @returns Payment intent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error("Failed to retrieve payment intent", {
      error: error instanceof Error ? error.message : String(error),
      paymentIntentId,
    });
    throw error;
  }
}

/**
 * Retrieve a charge by ID
 * @param chargeId Charge ID
 * @returns Charge
 */
export async function getCharge(chargeId: string): Promise<Stripe.Charge> {
  const stripe = getStripeClient();

  try {
    const charge = await stripe.charges.retrieve(chargeId);
    return charge;
  } catch (error) {
    logger.error("Failed to retrieve charge", {
      error: error instanceof Error ? error.message : String(error),
      chargeId,
    });
    throw error;
  }
}
