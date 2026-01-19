/**
 * Commission service functions
 * Handles commission calculation and payout business logic
 */

import {
  query,
  Prisma,
  CommissionStatus as PrismaCommissionStatus,
} from "@app/db";
import {
  Commission,
  CommissionStatus,
  DoctorCommissionSettings,
  CreateCommissionInput,
  CreateCommissionSettingsInput,
  UpdateCommissionSettingsInput,
  CommissionStats,
} from "@medbook/types";
import {
  createNotFoundError,
  createValidationError,
  createConflictError,
} from "../utils/errors";
import { logger } from "../utils/logger";
import { createTransfer } from "../utils/stripe";
import { getPaymentById } from "./payment.service";

/**
 * Convert Prisma CommissionStatus to @medbook/types CommissionStatus
 */
function convertCommissionStatus(
  status: PrismaCommissionStatus
): CommissionStatus {
  return status as CommissionStatus;
}

/**
 * Calculate commission amount from appointment amount and commission rate
 * @param appointmentAmount Total appointment amount
 * @param commissionRate Commission rate (e.g., 0.10 for 10%)
 * @returns Commission amount and doctor payout amount
 */
export function calculateCommission(
  appointmentAmount: number,
  commissionRate: number
): { commissionAmount: number; doctorPayoutAmount: number } {
  if (appointmentAmount <= 0) {
    throw createValidationError("Appointment amount must be greater than 0");
  }

  if (commissionRate < 0 || commissionRate > 1) {
    throw createValidationError(
      "Commission rate must be between 0 and 1 (0% to 100%)"
    );
  }

  const commissionAmount =
    Math.round(appointmentAmount * commissionRate * 100) / 100;
  const doctorPayoutAmount =
    Math.round((appointmentAmount - commissionAmount) * 100) / 100;

  return {
    commissionAmount,
    doctorPayoutAmount,
  };
}

/**
 * Get commission settings for a doctor
 * @param doctorId Doctor ID
 * @returns Commission settings or null if not set
 */
export async function getCommissionSettingsByDoctorId(
  doctorId: string
): Promise<DoctorCommissionSettings | null> {
  const settings = await query<{
    id: string;
    doctorId: string;
    commissionRate: unknown;
    appointmentPrice: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.doctorCommissionSettings.findUnique({
      where: { doctorId },
    })
  );

  if (!settings) {
    return null;
  }

  return {
    id: settings.id,
    doctorId: settings.doctorId,
    commissionRate: Number(settings.commissionRate),
    appointmentPrice: Number(settings.appointmentPrice),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Get or create default commission settings for a doctor
 * @param doctorId Doctor ID
 * @returns Commission settings (creates default if not exists)
 */
export async function getOrCreateCommissionSettings(
  doctorId: string
): Promise<DoctorCommissionSettings> {
  let settings = await getCommissionSettingsByDoctorId(doctorId);

  if (!settings) {
    // Create default settings (10% commission, $100 appointment price)
    settings = await createCommissionSettings({
      doctorId,
      commissionRate: 0.1, // 10%
      appointmentPrice: 100.0,
    });
  }

  return settings;
}

/**
 * Create commission settings for a doctor (admin only)
 * @param input Commission settings input
 * @returns Created commission settings
 */
export async function createCommissionSettings(
  input: CreateCommissionSettingsInput
): Promise<DoctorCommissionSettings> {
  const { doctorId, commissionRate, appointmentPrice } = input;

  // Validate commission rate
  if (commissionRate < 0 || commissionRate > 1) {
    throw createValidationError(
      "Commission rate must be between 0 and 1 (0% to 100%)"
    );
  }

  // Validate appointment price
  if (appointmentPrice <= 0) {
    throw createValidationError("Appointment price must be greater than 0");
  }

  // Verify doctor exists
  const doctor = await query<{
    id: string;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor");
  }

  // Check if settings already exist
  const existing = await getCommissionSettingsByDoctorId(doctorId);
  if (existing) {
    throw createConflictError(
      "Commission settings already exist for this doctor"
    );
  }

  // Create settings
  const settings = await query<{
    id: string;
    doctorId: string;
    commissionRate: unknown;
    appointmentPrice: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.doctorCommissionSettings.create({
      data: {
        doctorId,
        commissionRate,
        appointmentPrice,
      },
    })
  );

  logger.info("Commission settings created", {
    settingsId: settings.id,
    doctorId,
    commissionRate,
    appointmentPrice,
  });

  return {
    id: settings.id,
    doctorId: settings.doctorId,
    commissionRate: Number(settings.commissionRate),
    appointmentPrice: Number(settings.appointmentPrice),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Update commission settings for a doctor (admin only)
 * @param doctorId Doctor ID
 * @param input Update input
 * @returns Updated commission settings
 */
export async function updateCommissionSettings(
  doctorId: string,
  input: UpdateCommissionSettingsInput
): Promise<DoctorCommissionSettings> {
  const { commissionRate, appointmentPrice } = input;

  // Get existing settings
  const existing = await getCommissionSettingsByDoctorId(doctorId);
  if (!existing) {
    throw createNotFoundError("Commission settings");
  }

  // Validate commission rate if provided
  if (commissionRate !== undefined) {
    if (commissionRate < 0 || commissionRate > 1) {
      throw createValidationError(
        "Commission rate must be between 0 and 1 (0% to 100%)"
      );
    }
  }

  // Validate appointment price if provided
  if (appointmentPrice !== undefined) {
    if (appointmentPrice <= 0) {
      throw createValidationError("Appointment price must be greater than 0");
    }
  }

  // Update settings
  const settings = await query<{
    id: string;
    doctorId: string;
    commissionRate: unknown;
    appointmentPrice: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.doctorCommissionSettings.update({
      where: { doctorId },
      data: {
        ...(commissionRate !== undefined && { commissionRate }),
        ...(appointmentPrice !== undefined && { appointmentPrice }),
      },
    })
  );

  logger.info("Commission settings updated", {
    settingsId: settings.id,
    doctorId,
    commissionRate: settings.commissionRate,
    appointmentPrice: settings.appointmentPrice,
  });

  return {
    id: settings.id,
    doctorId: settings.doctorId,
    commissionRate: Number(settings.commissionRate),
    appointmentPrice: Number(settings.appointmentPrice),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Create a commission record for a payment
 * @param input Commission creation input
 * @returns Created commission record
 */
export async function createCommission(
  input: CreateCommissionInput
): Promise<Commission> {
  const {
    paymentId,
    appointmentId,
    doctorId,
    appointmentAmount,
    commissionRate,
  } = input;

  // Verify payment exists
  const payment = await getPaymentById(paymentId);
  if (payment.status !== "COMPLETED") {
    throw createValidationError(
      "Commission can only be created for completed payments"
    );
  }

  // Check if commission already exists
  const existing = await query<{
    id: string;
  } | null>((prisma) =>
    prisma.commission.findUnique({
      where: { paymentId },
      select: { id: true },
    })
  );

  if (existing) {
    throw createConflictError("Commission already exists for this payment");
  }

  // Calculate commission
  const { commissionAmount, doctorPayoutAmount } = calculateCommission(
    appointmentAmount,
    commissionRate
  );

  // Create commission record
  const commission = await query<{
    id: string;
    paymentId: string;
    appointmentId: string;
    doctorId: string;
    appointmentAmount: unknown;
    commissionRate: unknown;
    commissionAmount: unknown;
    doctorPayoutAmount: unknown;
    status: PrismaCommissionStatus;
    stripeTransferId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.commission.create({
      data: {
        paymentId,
        appointmentId,
        doctorId,
        appointmentAmount,
        commissionRate,
        commissionAmount,
        doctorPayoutAmount,
        status: PrismaCommissionStatus.PENDING,
      },
    })
  );

  logger.info("Commission created", {
    commissionId: commission.id,
    paymentId,
    appointmentId,
    doctorId,
    commissionAmount,
    doctorPayoutAmount,
  });

  return {
    id: commission.id,
    paymentId: commission.paymentId,
    appointmentId: commission.appointmentId,
    doctorId: commission.doctorId,
    appointmentAmount: Number(commission.appointmentAmount),
    commissionRate: Number(commission.commissionRate),
    commissionAmount: Number(commission.commissionAmount),
    doctorPayoutAmount: Number(commission.doctorPayoutAmount),
    status: convertCommissionStatus(commission.status),
    stripeTransferId: commission.stripeTransferId ?? undefined,
    paidAt: commission.paidAt ?? undefined,
    createdAt: commission.createdAt,
    updatedAt: commission.updatedAt,
  };
}

/**
 * Get commission by payment ID
 * @param paymentId Payment ID
 * @returns Commission record or null
 */
export async function getCommissionByPaymentId(
  paymentId: string
): Promise<Commission | null> {
  const commission = await query<{
    id: string;
    paymentId: string;
    appointmentId: string;
    doctorId: string;
    appointmentAmount: unknown;
    commissionRate: unknown;
    commissionAmount: unknown;
    doctorPayoutAmount: unknown;
    status: PrismaCommissionStatus;
    stripeTransferId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.commission.findUnique({
      where: { paymentId },
    })
  );

  if (!commission) {
    return null;
  }

  return {
    id: commission.id,
    paymentId: commission.paymentId,
    appointmentId: commission.appointmentId,
    doctorId: commission.doctorId,
    appointmentAmount: Number(commission.appointmentAmount),
    commissionRate: Number(commission.commissionRate),
    commissionAmount: Number(commission.commissionAmount),
    doctorPayoutAmount: Number(commission.doctorPayoutAmount),
    status: convertCommissionStatus(commission.status),
    stripeTransferId: commission.stripeTransferId ?? undefined,
    paidAt: commission.paidAt ?? undefined,
    createdAt: commission.createdAt,
    updatedAt: commission.updatedAt,
  };
}

/**
 * Get all commissions for a doctor
 * @param doctorId Doctor ID
 * @param filters Optional filters
 * @returns Array of commission records
 */
export async function getCommissionsByDoctorId(
  doctorId: string,
  filters?: {
    status?: CommissionStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Commission[]> {
  const where: Prisma.CommissionWhereInput = {
    doctorId,
  };

  if (filters?.status) {
    where.status = filters.status as PrismaCommissionStatus;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  const commissions = await query<
    {
      id: string;
      paymentId: string;
      appointmentId: string;
      doctorId: string;
      appointmentAmount: unknown;
      commissionRate: unknown;
      commissionAmount: unknown;
      doctorPayoutAmount: unknown;
      status: PrismaCommissionStatus;
      stripeTransferId: string | null;
      paidAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >((prisma) =>
    prisma.commission.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    })
  );

  return commissions.map((c) => ({
    id: c.id,
    paymentId: c.paymentId,
    appointmentId: c.appointmentId,
    doctorId: c.doctorId,
    appointmentAmount: Number(c.appointmentAmount),
    commissionRate: Number(c.commissionRate),
    commissionAmount: Number(c.commissionAmount),
    doctorPayoutAmount: Number(c.doctorPayoutAmount),
    status: convertCommissionStatus(c.status),
    stripeTransferId: c.stripeTransferId ?? undefined,
    paidAt: c.paidAt ?? undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/**
 * Process payout to doctor (immediate payout after appointment completion)
 * @param commissionId Commission ID
 * @returns Updated commission record
 */
export async function processPayout(commissionId: string): Promise<Commission> {
  // Get commission
  const commission = await query<{
    id: string;
    paymentId: string;
    appointmentId: string;
    doctorId: string;
    appointmentAmount: unknown;
    commissionRate: unknown;
    commissionAmount: unknown;
    doctorPayoutAmount: unknown;
    status: PrismaCommissionStatus;
    stripeTransferId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.commission.findUnique({
      where: { id: commissionId },
    })
  );

  if (!commission) {
    throw createNotFoundError("Commission");
  }

  // Check if already paid
  if (commission.status === PrismaCommissionStatus.PAID) {
    throw createValidationError("Commission has already been paid");
  }

  // Check if cancelled
  if (commission.status === PrismaCommissionStatus.CANCELLED) {
    throw createValidationError("Cannot payout a cancelled commission");
  }

  // Get doctor's Stripe Connect account ID
  const doctor = await query<{
    id: string;
    stripeAccountId: string | null;
  } | null>((prisma) =>
    prisma.doctor.findUnique({
      where: { id: commission.doctorId },
      select: {
        id: true,
        stripeAccountId: true,
      },
    })
  );

  if (!doctor) {
    throw createNotFoundError("Doctor");
  }

  if (!doctor.stripeAccountId) {
    throw createValidationError(
      "Doctor does not have a Stripe Connect account set up"
    );
  }

  // Get payment to verify it's completed
  const payment = await getPaymentById(commission.paymentId);
  if (payment.status !== "COMPLETED") {
    throw createValidationError(
      "Cannot payout commission for a payment that is not completed"
    );
  }

  // Create transfer to doctor's Stripe Connect account
  const transferAmount = Math.round(
    Number(commission.doctorPayoutAmount) * 100
  ); // Convert to cents
  const transfer = await createTransfer(
    transferAmount,
    doctor.stripeAccountId,
    {
      commissionId: commission.id,
      appointmentId: commission.appointmentId,
      paymentId: commission.paymentId,
    }
  );

  // Update commission record
  const updatedCommission = await query<{
    id: string;
    paymentId: string;
    appointmentId: string;
    doctorId: string;
    appointmentAmount: unknown;
    commissionRate: unknown;
    commissionAmount: unknown;
    doctorPayoutAmount: unknown;
    status: PrismaCommissionStatus;
    stripeTransferId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: PrismaCommissionStatus.PAID,
        stripeTransferId: transfer.id,
        paidAt: new Date(),
      },
    })
  );

  logger.info("Payout processed", {
    commissionId: updatedCommission.id,
    doctorId: commission.doctorId,
    transferId: transfer.id,
    amount: Number(commission.doctorPayoutAmount),
  });

  return {
    id: updatedCommission.id,
    paymentId: updatedCommission.paymentId,
    appointmentId: updatedCommission.appointmentId,
    doctorId: updatedCommission.doctorId,
    appointmentAmount: Number(updatedCommission.appointmentAmount),
    commissionRate: Number(updatedCommission.commissionRate),
    commissionAmount: Number(updatedCommission.commissionAmount),
    doctorPayoutAmount: Number(updatedCommission.doctorPayoutAmount),
    status: convertCommissionStatus(updatedCommission.status),
    stripeTransferId: updatedCommission.stripeTransferId ?? undefined,
    paidAt: updatedCommission.paidAt ?? undefined,
    createdAt: updatedCommission.createdAt,
    updatedAt: updatedCommission.updatedAt,
  };
}

/**
 * Cancel a commission (e.g., when appointment is cancelled before payout)
 * @param commissionId Commission ID
 * @returns Updated commission record
 */
export async function cancelCommission(
  commissionId: string
): Promise<Commission> {
  const commission = await query<{
    id: string;
    paymentId: string;
    appointmentId: string;
    doctorId: string;
    appointmentAmount: unknown;
    commissionRate: unknown;
    commissionAmount: unknown;
    doctorPayoutAmount: unknown;
    status: PrismaCommissionStatus;
    stripeTransferId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>((prisma) =>
    prisma.commission.findUnique({
      where: { id: commissionId },
    })
  );

  if (!commission) {
    throw createNotFoundError("Commission");
  }

  // Cannot cancel if already paid
  if (commission.status === PrismaCommissionStatus.PAID) {
    throw createValidationError(
      "Cannot cancel a commission that has already been paid"
    );
  }

  // Update commission status
  const updatedCommission = await query<{
    id: string;
    paymentId: string;
    appointmentId: string;
    doctorId: string;
    appointmentAmount: unknown;
    commissionRate: unknown;
    commissionAmount: unknown;
    doctorPayoutAmount: unknown;
    status: PrismaCommissionStatus;
    stripeTransferId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>((prisma) =>
    prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: PrismaCommissionStatus.CANCELLED,
      },
    })
  );

  logger.info("Commission cancelled", {
    commissionId: updatedCommission.id,
    paymentId: commission.paymentId,
  });

  return {
    id: updatedCommission.id,
    paymentId: updatedCommission.paymentId,
    appointmentId: updatedCommission.appointmentId,
    doctorId: updatedCommission.doctorId,
    appointmentAmount: Number(updatedCommission.appointmentAmount),
    commissionRate: Number(updatedCommission.commissionRate),
    commissionAmount: Number(updatedCommission.commissionAmount),
    doctorPayoutAmount: Number(updatedCommission.doctorPayoutAmount),
    status: convertCommissionStatus(updatedCommission.status),
    stripeTransferId: updatedCommission.stripeTransferId ?? undefined,
    paidAt: updatedCommission.paidAt ?? undefined,
    createdAt: updatedCommission.createdAt,
    updatedAt: updatedCommission.updatedAt,
  };
}

/**
 * Get commission statistics
 * @param doctorId Optional doctor ID to filter by
 * @returns Commission statistics
 */
export async function getCommissionStats(
  doctorId?: string
): Promise<CommissionStats> {
  const where: Prisma.CommissionWhereInput = {};
  if (doctorId) {
    where.doctorId = doctorId;
  }

  const commissions = await query<
    {
      status: PrismaCommissionStatus;
      commissionAmount: unknown;
      doctorPayoutAmount: unknown;
    }[]
  >((prisma) =>
    prisma.commission.findMany({
      where,
      select: {
        status: true,
        commissionAmount: true,
        doctorPayoutAmount: true,
      },
    })
  );

  let totalCommissions = 0;
  let totalPayouts = 0;
  let pendingPayouts = 0;
  const byStatus: Record<CommissionStatus, number> = {
    [CommissionStatus.PENDING]: 0,
    [CommissionStatus.PAID]: 0,
    [CommissionStatus.CANCELLED]: 0,
  };

  commissions.forEach((c) => {
    const status = convertCommissionStatus(c.status);
    byStatus[status]++;

    totalCommissions += Number(c.commissionAmount);

    if (status === "PAID") {
      totalPayouts += Number(c.doctorPayoutAmount);
    } else if (status === "PENDING") {
      pendingPayouts += Number(c.doctorPayoutAmount);
    }
  });

  return {
    totalCommissions,
    totalPayouts,
    pendingPayouts,
    byStatus,
  };
}
