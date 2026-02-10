# Capacity-Based Scheduling — Inventory & Cleanup Checklist

## STEP 0 — Inventory (completed)

### Database / Prisma

| Item               | Location                           | Action                                                                                                                          |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Slot model         | `packages/db/prisma/schema.prisma` | Keep for now (read-only/deprecate); new flow uses Schedule                                                                      |
| SlotTemplate model | same                               | Deprecate/remove from booking flow                                                                                              |
| Availability model | same                               | Keep for recurring patterns; new Schedule = date+window+capacity                                                                |
| Appointment model  | same                               | Add scheduleId, queueNumber, paymentStatus, paymentProvider, paymentIntentId, paidAt; extend status (PENDING_PAYMENT, OVERFLOW) |

### Backend API

| Item                   | Location                                             | Action                                                                                      |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Slot routes            | `apps/api/src/routes/slot.routes.ts`                 | Deprecate slot-based booking; keep or remove later                                          |
| Slot controller        | `apps/api/src/controllers/slot.controller.ts`        | Same                                                                                        |
| Slot service           | `apps/api/src/services/slot.service.ts`              | Same                                                                                        |
| Availability routes    | `apps/api/src/routes/availability.routes.ts`         | Keep for recurring; add admin schedule routes                                               |
| Appointment service    | `apps/api/src/services/appointment.service.ts`       | Add capacity flow; createAppointmentFromSlot → replace with booking start + webhook confirm |
| Appointment controller | `apps/api/src/controllers/appointment.controller.ts` | Add booking start; adjust create to support scheduleId + PENDING_PAYMENT                    |
| Payment service        | `apps/api/src/services/payment.service.ts`           | Reuse createPaymentIntent; add webhook handler for payment_intent.succeeded                 |
| Payment controller     | `apps/api/src/controllers/payment.controller.ts`     | Add Stripe webhook route (raw body)                                                         |
| **New**                | Admin schedule routes                                | POST/GET `/api/admin/schedules`                                                             |
| **New**                | Availability (patient)                               | GET `/api/availability?doctorId=&date=` → windows with confirmedCount, remaining            |
| **New**                | Booking start                                        | POST `/api/bookings/start` { scheduleId } → PaymentIntent + Appointment PENDING_PAYMENT     |
| **New**                | Stripe webhook                                       | POST (raw) → payment_intent.succeeded → assign token or OVERFLOW                            |
| **New**                | Admin manual booking                                 | POST `/api/admin/bookings/manual`                                                           |
| **New**                | Cancel                                               | POST `/api/appointments/:id/cancel` (existing; ensure no renumber)                          |

### Frontend

| Item               | Location                                                        | Action                                                                                                             |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Doctor detail page | `apps/web/app/doctors/[id]/page.tsx`                            | Replace slot picker with schedule windows; "Pay & Book" per window                                                 |
| Slots API proxy    | `apps/web/app/api/slots/`                                       | Replace with availability (windows) proxy                                                                          |
| Payment page       | `apps/web/app/payment/page.tsx`                                 | Use scheduleId + appointmentId; poll until CONFIRMED/OVERFLOW                                                      |
| Appointment detail | `apps/web/app/appointments/[id]/page.tsx`                       | Remove reschedule slot picker (or repurpose for schedule window change)                                            |
| TimeSlotSelector   | `apps/web/components/features/appointment/TimeSlotSelector.tsx` | Replace with ScheduleWindowSelector (window + remaining)                                                           |
| BookingForm        | `apps/web/components/features/appointment/BookingForm.tsx`      | Adapt to scheduleId, no slotId                                                                                     |
| Admin scheduling   | `apps/web/app/dashboard/doctor/availability/`                   | Add schedule creation (date, startTime, endTime, maxPatients); remove slot template/slot preview from booking path |
| Admin scheduling   | `apps/web/app/admin/`                                           | Add schedules management per doctor/date                                                                           |

### Types

| Item                 | Location                                  | Action                                                                                 |
| -------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| slot.types.ts        | `packages/types/src/slot.types.ts`        | Keep for legacy; add schedule.types.ts                                                 |
| appointment.types.ts | `packages/types/src/appointment.types.ts` | Add PENDING_PAYMENT, OVERFLOW; paymentStatus, paymentProvider, queueNumber, scheduleId |
| payment.types.ts     | `packages/types/src/payment.types.ts`     | Ensure metadata supports scheduleId, appointmentId                                     |

### Token policy

- **Monotonic tokens**: queueNumber = next available (count CONFIRMED + 1). No gap reuse when an appointment is cancelled.

### Corner cases covered

- **A** Same time window, multiple doctors: different `scheduleId` per doctor → no conflict.
- **B** Overlapping schedules same doctor: reject on create (409) if (new.start < existing.end && new.end > existing.start).
- **C** Race conditions: transaction + unique(scheduleId, queueNumber); assign token inside transaction.
- **D** Schedule full after payment: set status=OVERFLOW, paymentStatus=PAID, no queueNumber; log refund needed.
- **E** Cancellations: set CANCELLED; do not renumber; next booking gets next monotonic number.
- **F** Walk-ins: admin manual booking with paymentProvider CASH/ESEWA, assign token in same transaction.
- **G** Stats: use schedules + confirmed appointments only.
