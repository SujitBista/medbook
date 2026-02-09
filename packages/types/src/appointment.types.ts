/**
 * Appointment-related types
 * Represents patient appointments with doctors
 */

export enum AppointmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  BOOKED = "BOOKED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  NO_SHOW = "NO_SHOW",
}

/** Who cancelled the appointment (for refund policy audit) */
export enum CancelledBy {
  PATIENT = "PATIENT",
  DOCTOR = "DOCTOR",
  ADMIN = "ADMIN",
}

/** Payment info included when appointment has a linked payment (e.g. from Stripe) */
export interface AppointmentPaymentInfo {
  status: string; // COMPLETED, PENDING, PROCESSING, REFUNDED, etc.
  amount: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientEmail?: string; // Patient email for display purposes
  doctorId: string;
  availabilityId?: string; // Optional: link to specific availability slot
  slotId?: string; // Optional: link to specific slot (for slot-based booking)
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes?: string;
  isArchived?: boolean; // Whether the appointment has been archived (expired appointments)
  cancelledBy?: CancelledBy;
  cancelledAt?: Date;
  cancelReason?: string;
  /** Present when appointment has a linked payment (e.g. paid via Stripe) */
  payment?: AppointmentPaymentInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  availabilityId?: string; // Optional: link to specific availability slot
  slotId?: string; // Optional: link to specific slot (for slot-based booking)
  startTime: Date;
  endTime: Date;
  notes?: string;
}

export interface UpdateAppointmentInput {
  startTime?: Date;
  endTime?: Date;
  status?: AppointmentStatus;
  notes?: string;
}

/**
 * Input for cancelling an appointment
 * Includes user role for role-based cancellation rules (set from auth in API)
 */
export interface CancelAppointmentInput {
  appointmentId: string;
  userId: string;
  userRole: "PATIENT" | "DOCTOR" | "ADMIN";
  reason?: string;
}

/**
 * Refund eligibility result from cancellation policy
 */
export interface RefundDecision {
  eligible: boolean;
  type: "FULL" | "NONE";
  reason: string;
}

/** Payment summary returned after cancel (for UI) */
export interface CancelPaymentSummary {
  paymentId?: string;
  status?: string;
  refundedAmount?: number;
  refundId?: string;
  refundFailed?: boolean;
}

/** Result of POST /appointments/:id/cancel */
export interface CancelAppointmentResult {
  appointment: Appointment;
  refundDecision: RefundDecision;
  paymentSummary?: CancelPaymentSummary;
}

/**
 * Input for rescheduling an appointment
 * Includes the new slot ID and optional reason
 */
export interface RescheduleAppointmentInput {
  appointmentId: string;
  newSlotId: string;
  userId: string;
  userRole: "PATIENT" | "DOCTOR" | "ADMIN";
  reason?: string;
}

/**
 * Cancellation rules configuration
 */
export const CANCELLATION_RULES = {
  /** Minimum hours before appointment that patients can cancel */
  PATIENT_MIN_HOURS_BEFORE: 24,
  /** Whether doctors can cancel at any time */
  DOCTOR_CAN_CANCEL_ANYTIME: true,
  /** Whether admins can cancel at any time */
  ADMIN_CAN_CANCEL_ANYTIME: true,
} as const;
