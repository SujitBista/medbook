/**
 * Payment service functions
 * Handles payment processing and management business logic
 */

import { query, Prisma, PaymentStatus as PrismaPaymentStatus } from "@app/db";
import {
  Payment,
  PaymentStatus,
  CreatePaymentInput,
  CreatePaymentIntentInput,
  ConfirmPaymentInput,
  ProcessRefundInput,
  PaymentIntentResponse,
} from "@medbook/types";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
  createAppError,
} from "../utils/errors";
import { logger } from "../utils/logger";
import {
  createPaymentIntent,
  confirmPaymentIntent,
  processRefund,
  processPartialRefund,
  getPaymentIntent,
} from "../utils/stripe";
import { isStripeConfigured } from "../config/stripe";

/**
 * Convert Prisma PaymentStatus to @medbook/types PaymentStatus
 */
function convertPaymentStatus(status: PrismaPaymentStatus): PaymentStatus {
  return status as PaymentStatus;
}

/**
 * Create a payment intent for an appointment
 * @param input Payment intent creation input
 * @returns Payment intent response with client secret
 */
export async function createPaymentIntentForAppointment(
  input: CreatePaymentIntentInput
): Promise<PaymentIntentResponse> {
  const {
    amount,
    currency = "usd",
    appointmentId,
    patientId,
    doctorId,
    metadata,
  } = input;

  // Validate amount (must be positive and in cents)
  if (amount <= 0) {
    throw createValidationError("Payment amount must be greater than 0");
  }

  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    logger.error("Stripe is not configured", {
      patientId,
      doctorId,
      amount,
    });
    throw createAppError(
      "STRIPE_NOT_CONFIGURED",
      "Payment processing is not configured. Please contact support.",
      503
    );
  }

  // Verify appointment exists (optional - can be created later)
  // For now, we'll just create the payment intent

  // Create payment intent via Stripe
  // Only include appointmentId in metadata if it's provided
  const paymentMetadata: Record<string, string> = {
    patientId,
    doctorId,
    ...(appointmentId && { appointmentId }),
    ...(metadata as Record<string, string> | undefined),
  };

  try {
    const paymentIntent = await createPaymentIntent(
      amount,
      currency,
      paymentMetadata
    );

    logger.info("Payment intent created for appointment", {
      paymentIntentId: paymentIntent.id,
      appointmentId,
      amount,
      currency,
    });

    return {
      clientSecret: paymentIntent.client_secret || "",
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    // Log the full error for debugging
    logger.error("Failed to create payment intent", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      patientId,
      doctorId,
      amount,
      currency,
    });

    // If it's a Stripe configuration error, provide a clearer message
    if (
      error instanceof Error &&
      error.message.includes("Stripe secret key is not configured")
    ) {
      throw createAppError(
        "STRIPE_NOT_CONFIGURED",
        "Payment processing is not configured. Please contact support.",
        503
      );
    }

    // Re-throw Stripe API errors with a user-friendly message
    if (error instanceof Error) {
      throw createAppError(
        "PAYMENT_INTENT_CREATION_FAILED",
        `Failed to initialize payment: ${error.message}`,
        500
      );
    }

    throw error;
  }
}

/**
 * Create a payment record after payment intent is confirmed
 * @param input Payment creation input
 * @returns Created payment record
 */
export async function createPayment(
  input: CreatePaymentInput
): Promise<Payment> {
  const {
    appointmentId,
    patientId,
    doctorId,
    amount,
    currency = "usd",
    metadata,
  } = input;

  // Verify appointment exists
  const appointment = await query<{
    id: string;
    patientId: string;
    doctorId: string;
  } | null>((prisma) =>
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
      },
    })
  );

  if (!appointment) {
    throw createNotFoundError("Appointment");
  }

  // Verify patient matches
  if (appointment.patientId !== patientId) {
    throw createValidationError("Patient ID does not match appointment");
  }

  // Verify doctor matches
  if (appointment.doctorId !== doctorId) {
    throw createValidationError("Doctor ID does not match appointment");
  }

  // Check if payment already exists for this appointment
  const existingPayment = await query<{
    id: string;
  } | null>((prisma) =>
    prisma.payment.findUnique({
      where: { appointmentId },
      select: { id: true },
    })
  );

  if (existingPayment) {
    throw createConflictError("Payment already exists for this appointment");
  }

  // Create payment intent first (if not already created)
  // For now, we'll assume paymentIntentId is provided in metadata
  const paymentIntentId = metadata?.paymentIntentId as string | undefined;
  if (!paymentIntentId) {
    throw createValidationError("Payment intent ID is required");
  }

  // Verify payment intent with Stripe
  const stripePaymentIntent = await getPaymentIntent(paymentIntentId);

  // Create payment record
  const payment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.payment.create({
      data: {
        appointmentId,
        patientId,
        doctorId,
        amount,
        currency,
        status: PrismaPaymentStatus.PENDING,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: stripePaymentIntent.latest_charge
          ? typeof stripePaymentIntent.latest_charge === "string"
            ? stripePaymentIntent.latest_charge
            : stripePaymentIntent.latest_charge.id
          : null,
        refundedAmount: 0,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    })
  );

  logger.info("Payment record created", {
    paymentId: payment.id,
    appointmentId,
    paymentIntentId,
  });

  return {
    id: payment.id,
    appointmentId: payment.appointmentId,
    patientId: payment.patientId,
    doctorId: payment.doctorId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: convertPaymentStatus(payment.status),
    stripePaymentIntentId: payment.stripePaymentIntentId,
    stripeChargeId: payment.stripeChargeId ?? undefined,
    refundedAmount: Number(payment.refundedAmount),
    refundReason: payment.refundReason ?? undefined,
    metadata: payment.metadata as Record<string, unknown> | undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

/**
 * Confirm a payment after booking
 * @param input Payment confirmation input
 * @returns Updated payment record
 */
export async function confirmPayment(
  input: ConfirmPaymentInput
): Promise<Payment> {
  const { paymentIntentId, appointmentId } = input;

  // Find payment by payment intent ID
  const payment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    })
  );

  if (!payment) {
    throw createNotFoundError("Payment");
  }

  // Verify appointment matches
  if (payment.appointmentId !== appointmentId) {
    throw createValidationError("Appointment ID does not match payment");
  }

  // Confirm payment with Stripe (idempotent: no-op if already succeeded)
  const confirmedIntent = await confirmPaymentIntent(paymentIntentId);

  // Sync status, amount, and charge from Stripe (source of truth)
  const amountFromStripe =
    confirmedIntent.amount_received != null
      ? confirmedIntent.amount_received / 100
      : Number(payment.amount);

  const updatedPayment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status:
          confirmedIntent.status === "succeeded"
            ? PrismaPaymentStatus.COMPLETED
            : confirmedIntent.status === "processing"
              ? PrismaPaymentStatus.PROCESSING
              : PrismaPaymentStatus.FAILED,
        amount: amountFromStripe,
        stripeChargeId: confirmedIntent.latest_charge
          ? typeof confirmedIntent.latest_charge === "string"
            ? confirmedIntent.latest_charge
            : confirmedIntent.latest_charge.id
          : payment.stripeChargeId,
      },
    })
  );

  // Update appointment with payment ID if not already set
  await query((prisma) =>
    prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentId: updatedPayment.id,
      },
    })
  );

  logger.info("Payment confirmed", {
    paymentId: updatedPayment.id,
    appointmentId,
    status: updatedPayment.status,
  });

  return {
    id: updatedPayment.id,
    appointmentId: updatedPayment.appointmentId,
    patientId: updatedPayment.patientId,
    doctorId: updatedPayment.doctorId,
    amount: Number(updatedPayment.amount),
    currency: updatedPayment.currency,
    status: convertPaymentStatus(updatedPayment.status),
    stripePaymentIntentId: updatedPayment.stripePaymentIntentId,
    stripeChargeId: updatedPayment.stripeChargeId ?? undefined,
    refundedAmount: Number(updatedPayment.refundedAmount),
    refundReason: updatedPayment.refundReason ?? undefined,
    metadata: updatedPayment.metadata as Record<string, unknown> | undefined,
    createdAt: updatedPayment.createdAt,
    updatedAt: updatedPayment.updatedAt,
  };
}

/**
 * Process a refund for a payment
 * @param input Refund input
 * @returns Updated payment record
 */
export async function processPaymentRefund(
  input: ProcessRefundInput
): Promise<Payment> {
  const { paymentId, reason, amount } = input;

  // Get payment
  const payment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.payment.findUnique({
      where: { id: paymentId },
    })
  );

  if (!payment) {
    throw createNotFoundError("Payment");
  }

  // Check if payment can be refunded
  if (payment.status !== PrismaPaymentStatus.COMPLETED) {
    throw createValidationError("Only completed payments can be refunded");
  }

  if (!payment.stripeChargeId) {
    throw createValidationError("Payment charge ID not found");
  }

  // Check if already fully refunded
  const refundedAmount = Number(payment.refundedAmount);
  const totalAmount = Number(payment.amount);
  if (refundedAmount >= totalAmount) {
    throw createValidationError("Payment is already fully refunded");
  }

  // Calculate refund amount in cents (full refund if not specified)
  const refundAmountCents = amount
    ? Math.min(amount, totalAmount - refundedAmount)
    : totalAmount - refundedAmount;

  // Process refund with Stripe (full vs partial)
  const refund =
    refundAmountCents >= totalAmount - refundedAmount
      ? await processRefund(payment.stripeChargeId, reason)
      : await processPartialRefund(
          payment.stripeChargeId,
          refundAmountCents,
          reason
        );

  // Update payment record
  const newRefundedAmount = refundedAmount + Number(refund.amount);
  const isFullyRefunded = newRefundedAmount >= totalAmount;

  const updatedPayment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isFullyRefunded
          ? PrismaPaymentStatus.REFUNDED
          : PrismaPaymentStatus.PARTIALLY_REFUNDED,
        refundedAmount: newRefundedAmount,
        refundReason: reason || payment.refundReason,
      },
    })
  );

  logger.info("Payment refund processed", {
    paymentId: updatedPayment.id,
    refundId: refund.id,
    refundAmount: Number(refund.amount),
    isFullyRefunded,
  });

  return {
    id: updatedPayment.id,
    appointmentId: updatedPayment.appointmentId,
    patientId: updatedPayment.patientId,
    doctorId: updatedPayment.doctorId,
    amount: Number(updatedPayment.amount),
    currency: updatedPayment.currency,
    status: convertPaymentStatus(updatedPayment.status),
    stripePaymentIntentId: updatedPayment.stripePaymentIntentId,
    stripeChargeId: updatedPayment.stripeChargeId ?? undefined,
    refundedAmount: Number(updatedPayment.refundedAmount),
    refundReason: updatedPayment.refundReason ?? undefined,
    metadata: updatedPayment.metadata as Record<string, unknown> | undefined,
    createdAt: updatedPayment.createdAt,
    updatedAt: updatedPayment.updatedAt,
  };
}

/**
 * Get payment by appointment ID
 * @param appointmentId Appointment ID
 * @returns Payment record or null
 */
export async function getPaymentByAppointmentId(
  appointmentId: string
): Promise<Payment | null> {
  const payment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.payment.findUnique({
      where: { appointmentId },
    })
  );

  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    appointmentId: payment.appointmentId,
    patientId: payment.patientId,
    doctorId: payment.doctorId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: convertPaymentStatus(payment.status),
    stripePaymentIntentId: payment.stripePaymentIntentId,
    stripeChargeId: payment.stripeChargeId ?? undefined,
    refundedAmount: Number(payment.refundedAmount),
    refundReason: payment.refundReason ?? undefined,
    metadata: payment.metadata as Record<string, unknown> | undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

/**
 * Get payment by ID
 * @param paymentId Payment ID
 * @returns Payment record
 * @throws AppError if payment not found
 */
export async function getPaymentById(paymentId: string): Promise<Payment> {
  const payment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.payment.findUnique({
      where: { id: paymentId },
    })
  );

  if (!payment) {
    throw createNotFoundError("Payment");
  }

  return {
    id: payment.id,
    appointmentId: payment.appointmentId,
    patientId: payment.patientId,
    doctorId: payment.doctorId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: convertPaymentStatus(payment.status),
    stripePaymentIntentId: payment.stripePaymentIntentId,
    stripeChargeId: payment.stripeChargeId ?? undefined,
    refundedAmount: Number(payment.refundedAmount),
    refundReason: payment.refundReason ?? undefined,
    metadata: payment.metadata as Record<string, unknown> | undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

/**
 * Update payment status
 * @param paymentId Payment ID
 * @param status New payment status
 * @returns Updated payment record
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus
): Promise<Payment> {
  const payment = await query<{
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: unknown;
    currency: string;
    status: PrismaPaymentStatus;
    stripePaymentIntentId: string;
    stripeChargeId: string | null;
    refundedAmount: unknown;
    refundReason: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: status as PrismaPaymentStatus,
      },
    })
  );

  logger.info("Payment status updated", {
    paymentId: payment.id,
    status,
  });

  return {
    id: payment.id,
    appointmentId: payment.appointmentId,
    patientId: payment.patientId,
    doctorId: payment.doctorId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: convertPaymentStatus(payment.status),
    stripePaymentIntentId: payment.stripePaymentIntentId,
    stripeChargeId: payment.stripeChargeId ?? undefined,
    refundedAmount: Number(payment.refundedAmount),
    refundReason: payment.refundReason ?? undefined,
    metadata: payment.metadata as Record<string, unknown> | undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}
