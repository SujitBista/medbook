/**
 * Stripe configuration and client setup
 */

import Stripe from "stripe";
import { env } from "./env";
import { logger } from "../utils/logger";

let stripeClient: Stripe | null = null;

/**
 * Get or create Stripe client instance
 * Uses lazy initialization to avoid errors if Stripe key is not configured
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!env.stripeSecretKey) {
      throw new Error(
        "Stripe secret key is not configured. Please set STRIPE_SECRET_KEY environment variable."
      );
    }

    stripeClient = new Stripe(env.stripeSecretKey, {
      typescript: true,
    });

    logger.info("Stripe client initialized");
  }

  return stripeClient;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!env.stripeSecretKey;
}
