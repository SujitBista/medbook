/**
 * Payment-related TypeScript types
 */

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export interface Payment {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  refundedAmount: number;
  refundReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentInput {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentIntentInput {
  amount: number;
  currency?: string;
  appointmentId?: string; // Optional - appointments can be created after payment
  patientId: string;
  doctorId: string;
  metadata?: Record<string, unknown>;
}

export interface ConfirmPaymentInput {
  paymentIntentId: string;
  appointmentId: string;
}

export interface ProcessRefundInput {
  paymentId: string;
  reason?: string;
  amount?: number; // If not provided, full refund
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}
