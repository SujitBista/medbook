/**
 * Availability-related types
 * Represents doctor availability/schedule time slots
 */

export interface Availability {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday), undefined for one-time slots
  isRecurring: boolean;
  validFrom?: Date; // Start date for recurring schedules
  validTo?: Date; // End date for recurring schedules
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAvailabilityInput {
  doctorId: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday), undefined for one-time slots
  isRecurring?: boolean;
  validFrom?: Date; // Start date for recurring schedules
  validTo?: Date; // End date for recurring schedules
}

export interface UpdateAvailabilityInput {
  startTime?: Date;
  endTime?: Date;
  dayOfWeek?: number;
  isRecurring?: boolean;
  validFrom?: Date;
  validTo?: Date;
}
