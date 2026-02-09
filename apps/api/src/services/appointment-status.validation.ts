/**
 * Appointment status transition validation
 * Enforces valid status changes and time-based rules (e.g. no completing unconfirmed or future appointments).
 */

import { AppointmentStatus } from "@medbook/types";
import { createValidationError } from "../utils/errors";

export interface AssertValidStatusTransitionParams {
  currentStatus: AppointmentStatus;
  nextStatus: AppointmentStatus;
  appointmentStart: Date;
  appointmentEnd: Date;
  now: Date;
}

/**
 * Validates that a status transition is allowed. Throws createValidationError(400) if not.
 *
 * Rules:
 * - CANCELLED -> anything: disallowed
 * - COMPLETED -> anything: disallowed
 * - NO_SHOW -> anything: disallowed
 * - PENDING -> COMPLETED: disallowed (must be CONFIRMED first)
 * - (now > appointmentEnd) and nextStatus === CONFIRMED: disallowed
 * - CONFIRMED/BOOKED -> COMPLETED: allowed only if now >= appointmentStart
 * - PENDING -> CONFIRMED: allowed only if now <= appointmentEnd
 * - PENDING -> CANCELLED, CONFIRMED/BOOKED -> CANCELLED: allowed
 */
export function assertValidStatusTransition(
  params: AssertValidStatusTransitionParams
): void {
  const { currentStatus, nextStatus, appointmentStart, appointmentEnd, now } =
    params;
  const startAt = new Date(appointmentStart);
  const endAt = new Date(appointmentEnd);

  // Terminal statuses: no further updates
  if (currentStatus === AppointmentStatus.CANCELLED) {
    throw createValidationError("Cannot update a cancelled appointment.");
  }
  if (currentStatus === AppointmentStatus.COMPLETED) {
    throw createValidationError("Cannot update a completed appointment.");
  }
  if (currentStatus === AppointmentStatus.NO_SHOW) {
    throw createValidationError("Cannot update a no-show appointment.");
  }

  // No-op transition is allowed
  if (currentStatus === nextStatus) {
    return;
  }

  // CONFIRMED: only allow if appointment window has not ended
  if (nextStatus === AppointmentStatus.CONFIRMED) {
    if (now > endAt) {
      throw createValidationError("Cannot confirm a past appointment.");
    }
    return;
  }

  // COMPLETED: only from CONFIRMED or BOOKED, and only when appointment has started
  if (nextStatus === AppointmentStatus.COMPLETED) {
    const canCompleteFrom =
      currentStatus === AppointmentStatus.CONFIRMED ||
      currentStatus === AppointmentStatus.BOOKED;
    if (!canCompleteFrom) {
      throw createValidationError(
        "Cannot complete an unconfirmed appointment."
      );
    }
    if (now < startAt) {
      throw createValidationError(
        "Cannot complete an appointment that hasn't started."
      );
    }
    return;
  }

  // CANCELLED: allowed from PENDING, CONFIRMED, BOOKED (no time restriction per task)
  if (nextStatus === AppointmentStatus.CANCELLED) {
    return;
  }

  // Any other transition (e.g. CONFIRMED -> PENDING, BOOKED -> PENDING) is disallowed for safety
  throw createValidationError(
    `Invalid status transition from ${currentStatus} to ${nextStatus}.`
  );
}
