/**
 * Appointment-related types
 * Represents patient appointments with doctors
 */

export enum AppointmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
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
 * Includes user role for role-based cancellation rules
 */
export interface CancelAppointmentInput {
  appointmentId: string;
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
