/**
 * Capacity-based booking service
 * Booking start: create PENDING_PAYMENT appointment + Stripe PaymentIntent
 * Token assignment happens in Stripe webhook (payment_intent.succeeded)
 */

import { query, withTransaction } from "@app/db";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
  createAppError,
} from "../utils/errors";

const INVALID_AMOUNT_STATUS = 422;
import { logger } from "../utils/logger";
import { getScheduleById, countConfirmedForSchedule } from "./schedule.service";
import { getCommissionSettingsByDoctorId } from "./commission.service";
import { createPaymentIntent } from "../utils/stripe";
import { isStripeConfigured } from "../config/stripe";

/**
 * Build start/end DateTime for a schedule on its date (using schedule's time strings)
 */
function scheduleToStartEnd(schedule: {
  date: Date;
  startTime: string;
  endTime: string;
}): { startTime: Date; endTime: Date } {
  const [startH, startM] = schedule.startTime.split(":").map(Number);
  const [endH, endM] = schedule.endTime.split(":").map(Number);
  const start = new Date(schedule.date);
  start.setHours(startH ?? 0, startM ?? 0, 0, 0);
  const end = new Date(schedule.date);
  end.setHours(endH ?? 0, endM ?? 0, 0, 0);
  return { startTime: start, endTime: end };
}

/**
 * Start a capacity-based booking: create Appointment (PENDING_PAYMENT) + Stripe PaymentIntent
 * Returns clientSecret and appointmentId for frontend to complete payment
 */
export async function startBooking(
  scheduleId: string,
  patientId: string
): Promise<{ clientSecret: string; appointmentId: string }> {
  const schedule = await getScheduleById(scheduleId);

  const scheduleDate = new Date(schedule.date);
  scheduleDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (scheduleDate < today) {
    throw createValidationError(
      "This schedule is in the past. Please choose an upcoming date."
    );
  }

  const confirmedCount = await countConfirmedForSchedule(scheduleId);
  if (confirmedCount >= schedule.maxPatients) {
    logger.warn("Booking start rejected: schedule full", {
      event: "booking-start",
      scheduleId,
      confirmedCount,
      maxPatients: schedule.maxPatients,
    });
    throw createConflictError(
      "This schedule window is full. Please choose another time."
    );
  }

  if (!isStripeConfigured()) {
    throw createAppError(
      "STRIPE_NOT_CONFIGURED",
      "Payment processing is not configured.",
      503
    );
  }

  const commission = await getCommissionSettingsByDoctorId(schedule.doctorId);
  const amountDollars = commission?.appointmentPrice ?? 0;
  if (amountDollars <= 0) {
    throw createAppError(
      "INVALID_AMOUNT",
      "Appointment price must be greater than zero. Please select a valid schedule.",
      INVALID_AMOUNT_STATUS
    );
  }
  const amountCents = Math.round(amountDollars * 100);
  if (amountCents <= 0) {
    throw createAppError(
      "INVALID_AMOUNT",
      "Appointment price must be greater than zero.",
      INVALID_AMOUNT_STATUS
    );
  }

  const metadata: Record<string, string> = {
    scheduleId,
    patientId,
    doctorId: schedule.doctorId,
  };

  const paymentIntent = await createPaymentIntent(amountCents, "usd", metadata);
  const clientSecret = paymentIntent.client_secret;
  if (!clientSecret) {
    throw createAppError(
      "PAYMENT_INTENT_ERROR",
      "Failed to create payment intent",
      500
    );
  }

  const { startTime, endTime } = scheduleToStartEnd({
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
  });

  const appointment = await query<{
    id: string;
  }>((prisma) =>
    prisma.appointment.create({
      data: {
        patientId,
        doctorId: schedule.doctorId,
        scheduleId: schedule.id,
        startTime: startTime,
        endTime: endTime,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
        paymentProvider: "STRIPE",
        paymentIntentId: paymentIntent.id,
      },
      select: { id: true },
    })
  );

  logger.info("Booking started", {
    event: "booking-start",
    appointmentId: appointment.id,
    scheduleId,
    patientId,
    doctorId: schedule.doctorId,
  });

  return {
    clientSecret,
    appointmentId: appointment.id,
  };
}

/**
 * Admin manual booking (walk-in / cash / eSewa)
 * Creates CONFIRMED + PAID appointment with next queue number in one transaction
 */
export async function createManualBooking(params: {
  scheduleId: string;
  patientId: string;
  paymentProvider: "CASH" | "ESEWA";
  note?: string | null;
}): Promise<{ id: string; queueNumber: number }> {
  const { scheduleId, patientId, paymentProvider, note } = params;

  const result = await withTransaction(async (tx) => {
    const schedule = await tx.schedule.findUnique({
      where: { id: scheduleId },
      select: {
        id: true,
        doctorId: true,
        date: true,
        startTime: true,
        endTime: true,
        maxPatients: true,
      },
    });
    if (!schedule) {
      throw createNotFoundError("Schedule");
    }

    const confirmedCount = await tx.appointment.count({
      where: { scheduleId, status: "CONFIRMED" },
    });
    if (confirmedCount >= schedule.maxPatients) {
      logger.warn("Admin manual booking rejected: schedule full", {
        event: "booking-manual",
        scheduleId,
        confirmedCount,
        maxPatients: schedule.maxPatients,
      });
      throw createConflictError("This schedule window is full.");
    }

    const queueNumber = confirmedCount + 1;
    const { startTime, endTime } = scheduleToStartEnd({
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });

    const appointment = await tx.appointment.create({
      data: {
        patientId,
        doctorId: schedule.doctorId,
        scheduleId: schedule.id,
        startTime,
        endTime,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentProvider,
        paidAt: new Date(),
        queueNumber,
        notes: note ?? undefined,
      },
      select: { id: true, queueNumber: true },
    });

    logger.info("Admin manual booking created", {
      event: "booking-manual",
      appointmentId: appointment.id,
      scheduleId,
      queueNumber: appointment.queueNumber,
    });

    return {
      id: appointment.id,
      queueNumber: appointment.queueNumber!,
    };
  });

  return result;
}
