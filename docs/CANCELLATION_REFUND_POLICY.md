# Cancellation & Refund Policy (MVP)

## Where the policy lives

- **Public policy page (frontend):** [apps/web/app/policies/cancellation-refund/page.tsx](../apps/web/app/policies/cancellation-refund/page.tsx)
  - Route: `/policies/cancellation-refund`
  - Linked from the footer under Legal → "Cancellation & Refund".

- **Refund decision logic (backend):** [apps/api/src/services/refund-policy.service.ts](../apps/api/src/services/refund-policy.service.ts)
  - Function: `computeRefundDecision({ cancelledBy, cancelledAt, appointmentStartTime })`
  - Used by the cancel flow in [apps/api/src/services/appointment.service.ts](../apps/api/src/services/appointment.service.ts) when processing `POST /api/v1/appointments/:id/cancel`.

## Rules enforced

1. **Doctor or admin cancellation** → **Full refund** (automatic).
2. **Patient cancellation**
   - Cancelled **≥ 24 hours** before appointment `startTime` → **Full refund**.
   - Cancelled **< 24 hours** before → **No refund**.
3. **No-show** → **No refund** (status `NO_SHOW`; refund not applied when marking no-show).
4. **Reschedule** → Does not trigger a refund; payment applies to the new slot.
5. All timestamps are compared in **UTC** (e.g. Nepal-timezone safe).
6. **Idempotency:** Cancelling an already cancelled appointment returns the current state and does **not** issue a second refund.

Refunds are processed via the Stripe Refunds API using the payment’s `stripeChargeId`. If Stripe refund fails, the payment is set to `REFUND_FAILED` and the user sees an error; manual override can be added later.
