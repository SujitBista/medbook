/**
 * Slot-related types
 * Represents individual bookable time slots generated from availability
 */

export enum SlotStatus {
  AVAILABLE = "AVAILABLE",
  BOOKED = "BOOKED",
  BLOCKED = "BLOCKED",
  CANCELLED = "CANCELLED",
}

export interface Slot {
  id: string;
  doctorId: string;
  availabilityId?: string;
  startTime: Date;
  endTime: Date;
  status: SlotStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotTemplate {
  id: string;
  doctorId: string;
  durationMinutes: number; // Slot duration (15, 30, 60, etc.)
  bufferMinutes: number; // Buffer between slots
  advanceBookingDays: number; // How far ahead can patients book
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSlotTemplateInput {
  doctorId: string;
  durationMinutes?: number; // Default: 30
  bufferMinutes?: number; // Default: 0
  advanceBookingDays?: number; // Default: 30
}

export interface UpdateSlotTemplateInput {
  durationMinutes?: number;
  bufferMinutes?: number;
  advanceBookingDays?: number;
}

export interface GetSlotsQuery {
  doctorId: string;
  startDate?: Date;
  endDate?: Date;
  status?: SlotStatus;
}
