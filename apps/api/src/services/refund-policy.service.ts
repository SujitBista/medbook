/**
 * Refund policy for appointment cancellations
 * All timestamps compared in UTC for timezone-safe logic (e.g. Nepal).
 */

import type { RefundDecision } from "@medbook/types";

const HOURS_THRESHOLD_FULL_REFUND = 24;

export type CancelledByRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface ComputeRefundDecisionInput {
  cancelledBy: CancelledByRole;
  cancelledAt: Date; // UTC
  appointmentStartTime: Date; // UTC
}

/**
 * Computes refund eligibility for an appointment cancellation.
 * Rules (MVP):
 * - DOCTOR or ADMIN → FULL refund
 * - PATIENT: >= 24h before start → FULL refund; < 24h → NONE
 * - NO_SHOW is not applied here (handled when status is set to NO_SHOW; no refund).
 */
export function computeRefundDecision(
  input: ComputeRefundDecisionInput
): RefundDecision {
  const { cancelledBy, cancelledAt, appointmentStartTime } = input;

  const cancelledAtUtc = new Date(cancelledAt);
  const startUtc = new Date(appointmentStartTime);
  const diffMs = startUtc.getTime() - cancelledAtUtc.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (cancelledBy === "DOCTOR" || cancelledBy === "ADMIN") {
    return {
      eligible: true,
      type: "FULL",
      reason: "Doctor or clinic cancellation: full refund per policy.",
    };
  }

  if (cancelledBy === "PATIENT") {
    if (diffHours >= HOURS_THRESHOLD_FULL_REFUND) {
      return {
        eligible: true,
        type: "FULL",
        reason: "Cancelled at least 24 hours before appointment: full refund.",
      };
    }
    return {
      eligible: false,
      type: "NONE",
      reason:
        "Cancelled less than 24 hours before appointment: no refund per policy.",
    };
  }

  return {
    eligible: false,
    type: "NONE",
    reason: "Unknown canceller: no refund.",
  };
}
