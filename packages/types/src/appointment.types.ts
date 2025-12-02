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
