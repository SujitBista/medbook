"use client";

import React, { useState } from "react";
import { Button, Card } from "@medbook/ui";
import { TimeSlot, formatDateTime } from "./utils";
import { CreateAppointmentInput } from "@medbook/types";
import { PaymentForm } from "@/components/features/payment/PaymentForm";
import { StripeProvider } from "@/components/features/payment/StripeProvider";
import Link from "next/link";
import { ClockIcon } from "@heroicons/react/24/outline";

interface BookingFormProps {
  doctorId: string;
  patientId: string;
  selectedSlot: TimeSlot | null;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  /** Display name for the logged-in patient (shown in confirmation) */
  patientName?: string;
  /** Email for the logged-in patient (shown in confirmation) */
  patientEmail?: string;
  // Payment props
  appointmentPrice?: number;
  paymentIntentId?: string;
  clientSecret?: string;
  onPaymentSuccess?: (paymentIntentId: string) => void;
  showPayment?: boolean;
}

/**
 * Form component for booking an appointment
 */
export function BookingForm({
  doctorId,
  patientId,
  selectedSlot,
  onSubmit,
  onCancel,
  loading = false,
  patientName,
  patientEmail,
  appointmentPrice,
  paymentIntentId,
  clientSecret,
  onPaymentSuccess,
  showPayment = false,
}: BookingFormProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const handlePaymentSuccess = (piId: string) => {
    setPaymentCompleted(true);
    if (onPaymentSuccess) {
      onPaymentSuccess(piId);
    }
    // Automatically proceed to booking after payment
    handleBookingSubmit();
  };

  const handleBookingSubmit = async () => {
    setError(null);

    if (!selectedSlot) {
      setError("Please select a time slot");
      return;
    }

    // Note: Login check removed - this function should only be called when authenticated
    // The UI prevents submission when not authenticated

    // If payment is required, ensure it's completed
    if (
      showPayment &&
      appointmentPrice &&
      !paymentCompleted &&
      !paymentIntentId
    ) {
      setError("Payment is required to complete booking");
      return;
    }

    try {
      const input: CreateAppointmentInput = {
        patientId,
        doctorId,
        availabilityId: selectedSlot.availabilityId,
        slotId: selectedSlot.id, // Include slotId for atomic slot-based booking
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: notes.trim() || undefined,
      };

      await onSubmit(input);
    } catch (err) {
      console.error("[BookingForm] Error submitting booking:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to book appointment. Please try again."
      );
    }
  };

  // Determine authentication state
  const isAuthenticated = patientId && patientId.trim() !== "";
  const loginCallbackUrl = `/doctors/${doctorId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if not authenticated
    if (!isAuthenticated) {
      return;
    }

    // If payment is required and not completed, don't submit yet
    if (showPayment && appointmentPrice && !paymentCompleted) {
      return;
    }

    await handleBookingSubmit();
  };

  const patientDisplay =
    (patientName?.trim() || patientEmail?.trim()) && isAuthenticated;

  return (
    <Card title="Confirm your appointment">
      {selectedSlot ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Login Required Message - Only show when NOT authenticated */}
          {!isAuthenticated && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Sign in to continue</p>
              <p className="text-sm mb-4">
                Please sign in or create an account to book this appointment.
              </p>
              <div className="flex gap-3">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(loginCallbackUrl)}`}
                  className="flex-1"
                >
                  <Button variant="primary" className="w-full" type="button">
                    Log in to book
                  </Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button variant="outline" className="w-full" type="button">
                    Create account
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Emphasized selected time slot */}
          <div className="rounded-xl border-2 border-primary-300 bg-primary-50/60 px-5 py-5">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-5 w-5 text-primary-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Your appointment
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
              {formatDateTime(selectedSlot.startTime)}
            </p>
            <p className="text-sm text-gray-600">
              {Math.round(
                (selectedSlot.endTime.getTime() -
                  selectedSlot.startTime.getTime()) /
                  60000
              )}{" "}
              minutes
            </p>
            {appointmentPrice && (
              <p className="mt-2 text-sm font-semibold text-gray-900">
                ${appointmentPrice.toFixed(2)}
              </p>
            )}
            {/* Minimal read-only booking identity confirmation */}
            {patientDisplay && (
              <div className="mt-3 pt-3 border-t border-primary-200">
                <p className="text-xs text-primary-700">
                  <span className="font-medium">
                    {patientName?.trim() || patientEmail?.trim()}
                  </span>
                  {patientName?.trim() && patientEmail?.trim() && (
                    <span className="text-primary-600">
                      {" "}
                      · {patientEmail?.trim()}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes for the doctor{" "}
              <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. symptoms, follow-up questions, or special requests for the doctor"
              rows={3}
              disabled={!isAuthenticated}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            />
            {isAuthenticated ? (
              <p className="mt-1.5 text-xs text-gray-500">
                Optional. Share anything you&apos;d like the doctor to know
                before your visit.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-amber-600">
                Sign in to add notes for the doctor.
              </p>
            )}
          </div>

          {/* Payment Section */}
          {showPayment &&
            appointmentPrice &&
            clientSecret &&
            paymentIntentId &&
            !paymentCompleted && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Payment Information
                </h3>
                <StripeProvider clientSecret={clientSecret}>
                  <PaymentForm
                    amount={appointmentPrice}
                    paymentIntentId={paymentIntentId}
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onError={(err) => setError(err)}
                    onCancel={onCancel}
                  />
                </StripeProvider>
              </div>
            )}

          {paymentCompleted && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <p className="text-sm">Payment completed successfully!</p>
            </div>
          )}

          {/* Only show error messages when authenticated (login errors are handled via UI state, not error messages) */}
          {error && isAuthenticated && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Only show booking button when authenticated and payment is completed or not required */}
          {isAuthenticated &&
            (!showPayment || paymentCompleted || !appointmentPrice) && (
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || (showPayment && !paymentCompleted)}
                  className="w-full flex-1 sm:w-auto"
                >
                  {loading ? "Booking..." : "Confirm booking"}
                </Button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Change slot
                </button>
              </div>
            )}
        </form>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Please select a time slot to continue booking.
          </p>
        </div>
      )}
    </Card>
  );
}
