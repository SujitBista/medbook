# Capacity-Based Scheduling — Summary

## Token policy: **monotonic**

- Queue numbers never reuse gaps. When an appointment is cancelled, the next new booking gets `queueNumber = confirmedCount + 1`.
- Counts only **CONFIRMED** appointments; PENDING_PAYMENT, CANCELLED, and OVERFLOW do not consume a token.

## Corner cases handled

| Case                                      | Handling                                                                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A) Same time window, multiple doctors** | Each doctor has their own `Schedule` row (same date/time range allowed). Capacity and queue are per `scheduleId`.                                                                                    |
| **B) Overlapping schedules, same doctor** | On create, we reject (409) if the new window overlaps any existing schedule for that doctor on that date (`start < existing.end && end > existing.start`).                                           |
| **C) Race conditions**                    | Token assignment runs in a DB transaction. Unique constraint `(scheduleId, queueNumber)` prevents duplicate tokens.                                                                                  |
| **D) Schedule full after payment**        | In webhook, if `confirmedCount >= maxPatients` at confirmation time, we set status=**OVERFLOW**, paymentStatus=PAID, no `queueNumber`. Log "OVERFLOW_AFTER_PAYMENT"; refund to be implemented later. |
| **E) Cancellations**                      | Status set to CANCELLED; we do **not** renumber other appointments.                                                                                                                                  |
| **F) Walk-ins / admin**                   | `POST /api/v1/admin/bookings/manual` creates CONFIRMED + PAID + next `queueNumber` in one transaction (paymentProvider CASH or ESEWA).                                                               |
| **G) Stats**                              | Use schedules and confirmed appointments only (no slot-based logic).                                                                                                                                 |

## New API surface

- **Admin**
  - `POST /api/v1/admin/schedules` — create schedule (doctorId, date, startTime, endTime, maxPatients)
  - `GET /api/v1/admin/schedules` — list (doctorId, date, startDate, endDate)
  - `POST /api/v1/admin/bookings/manual` — manual/walk-in booking
- **Public**
  - `GET /api/v1/availability/windows?doctorId=&date=` — capacity windows with `confirmedCount`, `remaining`
- **Patient (auth)**
  - `POST /api/v1/bookings/start` — body `{ scheduleId }` → creates PENDING_PAYMENT appointment + PaymentIntent; returns `{ clientSecret, appointmentId }`
- **Stripe**
  - `POST /api/v1/webhooks/stripe` — raw body; on `payment_intent.succeeded` assigns token or OVERFLOW.

## Flow (patient)

1. Patient chooses a **schedule window** (e.g. "9:00–12:00 • Remaining: 6/15").
2. Clicks "Pay & Book" → `POST /bookings/start { scheduleId }` → get `clientSecret` + `appointmentId`.
3. Completes payment with Stripe (clientSecret).
4. Stripe sends `payment_intent.succeeded` → webhook assigns **queue number** (or OVERFLOW if full).
5. Frontend polls `GET /appointments/:id` until status is CONFIRMED or OVERFLOW, then shows "Your token number is #X" or "Schedule became full. Refund will be processed."

## Observability

Structured log events:

- `[schedule-create]` — schedule created
- `[booking-start]` — booking start requested
- `[stripe-webhook]` — webhook received/processed
- `[token-assign]` — queue number assigned
- `[overflow]` — OVERFLOW_AFTER_PAYMENT

Errors use existing `{ code, message }` style (e.g. validation, conflict, not found).
