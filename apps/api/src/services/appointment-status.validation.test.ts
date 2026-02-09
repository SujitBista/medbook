/**
 * Unit tests for appointment status transition validation
 */

import { describe, it, expect } from "vitest";
import { assertValidStatusTransition } from "./appointment-status.validation";
import { AppointmentStatus } from "@medbook/types";

function date(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

describe("assertValidStatusTransition", () => {
  const now = new Date();
  const futureStart = date(1);
  const futureEnd = date(2);
  const pastStart = date(-2);
  const pastEnd = date(-1);

  it("rejects PENDING -> COMPLETED", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.PENDING,
        nextStatus: AppointmentStatus.COMPLETED,
        appointmentStart: pastStart,
        appointmentEnd: pastEnd,
        now,
      })
    ).toThrow("Cannot complete an unconfirmed appointment.");
  });

  it("accepts CONFIRMED -> COMPLETED when now >= appointmentStart", () => {
    const start = date(-1);
    const end = date(1);
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.CONFIRMED,
        nextStatus: AppointmentStatus.COMPLETED,
        appointmentStart: start,
        appointmentEnd: end,
        now,
      })
    ).not.toThrow();
  });

  it("rejects CONFIRMED -> COMPLETED when appointment is in the future", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.CONFIRMED,
        nextStatus: AppointmentStatus.COMPLETED,
        appointmentStart: futureStart,
        appointmentEnd: futureEnd,
        now,
      })
    ).toThrow("Cannot complete an appointment that hasn't started.");
  });

  it("rejects CONFIRMED when appointment is in the past (past CONFIRMED)", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.PENDING,
        nextStatus: AppointmentStatus.CONFIRMED,
        appointmentStart: pastStart,
        appointmentEnd: pastEnd,
        now,
      })
    ).toThrow("Cannot confirm a past appointment.");
  });

  it("rejects CANCELLED -> CONFIRMED", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.CANCELLED,
        nextStatus: AppointmentStatus.CONFIRMED,
        appointmentStart: futureStart,
        appointmentEnd: futureEnd,
        now,
      })
    ).toThrow("Cannot update a cancelled appointment.");
  });

  it("rejects COMPLETED -> CANCELLED", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.COMPLETED,
        nextStatus: AppointmentStatus.CANCELLED,
        appointmentStart: pastStart,
        appointmentEnd: pastEnd,
        now,
      })
    ).toThrow("Cannot update a completed appointment.");
  });

  it("allows PENDING -> CONFIRMED when now <= appointmentEnd", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.PENDING,
        nextStatus: AppointmentStatus.CONFIRMED,
        appointmentStart: futureStart,
        appointmentEnd: futureEnd,
        now,
      })
    ).not.toThrow();
  });

  it("allows PENDING -> CANCELLED", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.PENDING,
        nextStatus: AppointmentStatus.CANCELLED,
        appointmentStart: futureStart,
        appointmentEnd: futureEnd,
        now,
      })
    ).not.toThrow();
  });

  it("allows CONFIRMED -> CANCELLED", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.CONFIRMED,
        nextStatus: AppointmentStatus.CANCELLED,
        appointmentStart: futureStart,
        appointmentEnd: futureEnd,
        now,
      })
    ).not.toThrow();
  });

  it("allows no-op transition (same status)", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.CONFIRMED,
        nextStatus: AppointmentStatus.CONFIRMED,
        appointmentStart: futureStart,
        appointmentEnd: futureEnd,
        now,
      })
    ).not.toThrow();
  });

  it("allows BOOKED -> COMPLETED when now >= appointmentStart", () => {
    const start = date(-1);
    const end = date(1);
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.BOOKED,
        nextStatus: AppointmentStatus.COMPLETED,
        appointmentStart: start,
        appointmentEnd: end,
        now,
      })
    ).not.toThrow();
  });

  it("rejects NO_SHOW -> CONFIRMED", () => {
    expect(() =>
      assertValidStatusTransition({
        currentStatus: AppointmentStatus.NO_SHOW,
        nextStatus: AppointmentStatus.CONFIRMED,
        appointmentStart: futureStart,
        appointmentEnd: futureEnd,
        now,
      })
    ).toThrow("Cannot update a no-show appointment.");
  });
});
