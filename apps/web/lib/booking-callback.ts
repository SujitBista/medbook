/**
 * Utilities for preserving appointment context across auth redirects.
 * Used when redirecting unauthenticated users to login from the booking confirm step;
 * after login, we redirect back to the confirm page with slotId/doctorId restored.
 */

export const BOOKING_CONFIRM_PARAMS = {
  SLOT_ID: "slotId",
  AVAILABILITY_ID: "availabilityId",
  START_TIME: "startTime",
  END_TIME: "endTime",
  CONFIRM: "confirm",
} as const;

export interface BookingConfirmSlot {
  id: string;
  availabilityId: string;
  startTime: Date;
  endTime: Date;
}

export interface ParsedBookingConfirmParams {
  slotId: string;
  availabilityId: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Builds the callback URL for login redirect when user is on the confirm step.
 * Includes doctorId (in path), slotId, availabilityId, startTime, endTime, and confirm=1.
 * After login, the doctor page reads these params and restores the confirm UI.
 */
export function buildBookingConfirmCallbackUrl(
  doctorId: string,
  slot: BookingConfirmSlot
): string {
  const base = `/doctors/${doctorId}`;
  const params = new URLSearchParams();
  params.set(BOOKING_CONFIRM_PARAMS.SLOT_ID, slot.id);
  params.set(BOOKING_CONFIRM_PARAMS.AVAILABILITY_ID, slot.availabilityId);
  params.set(BOOKING_CONFIRM_PARAMS.START_TIME, slot.startTime.toISOString());
  params.set(BOOKING_CONFIRM_PARAMS.END_TIME, slot.endTime.toISOString());
  params.set(BOOKING_CONFIRM_PARAMS.CONFIRM, "1");
  return `${base}?${params.toString()}`;
}

/**
 * Parses booking confirm params from URL search params.
 * Returns null if any required param is missing or invalid.
 */
export function parseBookingConfirmParams(
  searchParams: URLSearchParams
): ParsedBookingConfirmParams | null {
  const slotId = searchParams.get(BOOKING_CONFIRM_PARAMS.SLOT_ID);
  const availabilityId = searchParams.get(
    BOOKING_CONFIRM_PARAMS.AVAILABILITY_ID
  );
  const startTimeRaw = searchParams.get(BOOKING_CONFIRM_PARAMS.START_TIME);
  const endTimeRaw = searchParams.get(BOOKING_CONFIRM_PARAMS.END_TIME);
  const confirm = searchParams.get(BOOKING_CONFIRM_PARAMS.CONFIRM);

  if (
    !slotId ||
    !availabilityId ||
    !startTimeRaw ||
    !endTimeRaw ||
    confirm !== "1"
  ) {
    return null;
  }

  const startTime = new Date(startTimeRaw);
  const endTime = new Date(endTimeRaw);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return null;
  }

  return { slotId, availabilityId, startTime, endTime };
}
