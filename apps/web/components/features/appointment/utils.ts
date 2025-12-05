/**
 * Utility functions for appointment booking
 */

import { Availability, Appointment, SlotStatus } from "@medbook/types";

export interface TimeSlot {
  id?: string;
  startTime: Date;
  endTime: Date;
  availabilityId?: string;
  status?: SlotStatus;
}

/**
 * Generates available time slots from availability data
 * Handles both one-time and recurring availability slots
 * @param availabilities List of availability slots
 * @param existingAppointments List of existing appointments (to exclude booked slots)
 * @param startDate Start date for generating slots
 * @param endDate End date for generating slots (defaults to 30 days from start)
 * @returns Array of available time slots
 */
export function generateAvailableTimeSlots(
  availabilities: Availability[],
  existingAppointments: Appointment[] = [],
  startDate: Date = new Date(),
  endDate: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const bookedSlots = new Set<string>();

  // Create a set of booked time ranges for quick lookup
  existingAppointments.forEach((apt) => {
    if (apt.status !== "CANCELLED") {
      const key = `${apt.startTime.getTime()}-${apt.endTime.getTime()}`;
      bookedSlots.add(key);
    }
  });

  // Helper to check if a slot is booked
  const isSlotBooked = (start: Date, end: Date): boolean => {
    return existingAppointments.some((apt) => {
      if (apt.status === "CANCELLED") return false;
      // Check for overlap
      return start < apt.endTime && end > apt.startTime;
    });
  };

  availabilities.forEach((availability) => {
    if (availability.isRecurring && availability.dayOfWeek !== undefined) {
      // Handle recurring availability
      const validFrom = availability.validFrom
        ? new Date(availability.validFrom)
        : startDate;
      const validTo = availability.validTo
        ? new Date(availability.validTo)
        : endDate;

      // Generate slots for each occurrence of the day of week
      const currentDate = new Date(validFrom);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= validTo) {
        // Check if current date matches the day of week
        if (currentDate.getDay() === availability.dayOfWeek) {
          const slotStart = new Date(currentDate);
          const slotStartTime = new Date(availability.startTime);
          slotStart.setHours(
            slotStartTime.getHours(),
            slotStartTime.getMinutes(),
            0,
            0
          );

          const slotEnd = new Date(currentDate);
          const slotEndTime = new Date(availability.endTime);
          slotEnd.setHours(
            slotEndTime.getHours(),
            slotEndTime.getMinutes(),
            0,
            0
          );

          // Only include slots in the future and within valid range
          if (
            slotStart >= startDate &&
            slotStart <= validTo &&
            !isSlotBooked(slotStart, slotEnd)
          ) {
            slots.push({
              startTime: slotStart,
              endTime: slotEnd,
              availabilityId: availability.id,
            });
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Handle one-time availability
      const slotStart = new Date(availability.startTime);
      const slotEnd = new Date(availability.endTime);

      // Only include slots in the future and within date range
      if (
        slotStart >= startDate &&
        slotStart <= endDate &&
        !isSlotBooked(slotStart, slotEnd)
      ) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          availabilityId: availability.id,
        });
      }
    }
  });

  // Sort slots by start time
  slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return slots;
}

/**
 * Converts a date value (Date object or string) to a Date object
 * @param date Date object or ISO date string
 * @returns Date object
 * @throws Error if date is invalid
 */
function toDate(date: Date | string): Date {
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date value");
    }
    return date;
  }

  if (typeof date === "string") {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${date}`);
    }
    return parsed;
  }

  throw new Error(`Invalid date type: ${typeof date}`);
}

/**
 * Formats a date to a readable string
 * @param date Date object or ISO date string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = toDate(date);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

/**
 * Formats a time to a readable string
 * @param date Date object or ISO date string
 * @returns Formatted time string
 */
export function formatTime(date: Date | string): string {
  const dateObj = toDate(date);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);
}

/**
 * Formats a date and time together
 * @param date Date object or ISO date string
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Groups time slots by date
 */
export function groupSlotsByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>();

  slots.forEach((slot) => {
    const dateKey = slot.startTime.toISOString().split("T")[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(slot);
  });

  return grouped;
}
