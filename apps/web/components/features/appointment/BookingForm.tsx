"use client";

import React, { useState, useMemo } from "react";
import { Button, Card } from "@medbook/ui";
import { TimeSlot, formatDateTime } from "./utils";
import { CreateAppointmentInput } from "@medbook/types";
import { PaymentForm } from "@/components/features/payment/PaymentForm";
import { StripeProvider } from "@/components/features/payment/StripeProvider";
import Link from "next/link";
import { ClockIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { buildBookingConfirmCallbackUrl } from "@/lib/booking-callback";

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
  const loginCallbackUrl = useMemo(() => {
    if (selectedSlot?.id && selectedSlot?.availabilityId) {
      return buildBookingConfirmCallbackUrl(doctorId, {
        id: selectedSlot.id,
        availabilityId: selectedSlot.availabilityId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
    }
    return `/doctors/${doctorId}`;
  }, [doctorId, selectedSlot]);

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
        <form
          data-testid="booking-confirm-form"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Login Required Message - Only show when NOT authenticated */}
          {!isAuthenticated && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-5 py-5 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Step 2 of 3
                </span>
                <span className="text-blue-600">·</span>
                <span className="text-sm font-medium">Sign in to continue</span>
              </div>
              <p className="text-sm text-blue-700 mb-5 leading-relaxed">
                We&apos;ll securely save your appointment details. Sign in to
                complete your booking.
              </p>
              <div className="space-y-3">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(loginCallbackUrl)}`}
                  className="block"
                >
                  <Button variant="primary" className="w-full" type="button">
                    Sign in to book
                  </Button>
                </Link>
                <div className="text-center">
                  <Link
                    href={`/register?callbackUrl=${encodeURIComponent(loginCallbackUrl)}`}
                    className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2"
                  >
                    Don&apos;t have an account? Create one
                  </Link>
                </div>
                <p className="text-xs text-center text-blue-600 mt-3">
                  Your information is encrypted and secure
                </p>
              </div>
            </div>
          )}

          {/* Emphasized selected time slot */}
          <div
            className={`rounded-xl border-2 ${
              isAuthenticated
                ? "border-primary-400 bg-gradient-to-br from-primary-50 to-primary-100/80"
                : "border-gray-300 bg-gray-50/60"
            } px-6 py-6 shadow-sm relative`}
          >
            {!isAuthenticated && (
              <div className="absolute inset-0 bg-white/40 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <LockClosedIcon className="h-6 w-6" />
                  <span className="text-xs font-medium">Sign in to unlock</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon
                className={`h-6 w-6 ${
                  isAuthenticated ? "text-primary-600" : "text-gray-400"
                }`}
              />
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isAuthenticated ? "text-primary-700" : "text-gray-500"
                }`}
              >
                Your appointment
              </span>
            </div>
            <p
              className={`text-3xl font-bold tracking-tight mb-2 ${
                isAuthenticated ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {formatDateTime(selectedSlot.startTime)}
            </p>
            <p
              className={`text-base font-medium ${
                isAuthenticated ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {Math.round(
                (selectedSlot.endTime.getTime() -
                  selectedSlot.startTime.getTime()) /
                  60000
              )}{" "}
              minutes
            </p>
            {appointmentPrice && (
              <p
                className={`mt-2 text-sm font-semibold ${
                  isAuthenticated ? "text-gray-900" : "text-gray-400"
                }`}
              >
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
              placeholder={
                isAuthenticated
                  ? "e.g. 'Follow-up for chest pain', 'Medication review needed', 'Discuss test results from last visit'"
                  : "Sign in to add notes for your doctor"
              }
              rows={3}
              disabled={!isAuthenticated}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:placeholder:text-gray-300"
            />
            {isAuthenticated ? (
              <p className="mt-1.5 text-xs text-gray-500">
                Optional. Share anything you&apos;d like the doctor to know
                before your visit.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500">
                This field will be available after you sign in.
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
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || (showPayment && !paymentCompleted)}
                  className="w-full"
                >
                  {loading
                    ? "Booking..."
                    : appointmentPrice
                      ? "Pay & confirm appointment"
                      : "Confirm appointment"}
                </Button>
                <p className="mt-2 text-xs text-center text-gray-500">
                  You&apos;ll receive a confirmation email. No charges until
                  your visit.
                </p>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Change time slot
                  </button>
                </div>
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
