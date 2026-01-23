"use client";

import React, { useState } from "react";
import { Button, Card } from "@medbook/ui";
import { TimeSlot, formatDateTime } from "./utils";
import { CreateAppointmentInput } from "@medbook/types";
import { PaymentForm } from "@/components/features/payment/PaymentForm";
import { StripeProvider } from "@/components/features/payment/StripeProvider";
import Link from "next/link";

interface BookingFormProps {
  doctorId: string;
  patientId: string;
  selectedSlot: TimeSlot | null;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
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

  return (
    <Card title="Book Appointment">
      {selectedSlot ? (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                    Log in
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
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Selected Time Slot</p>
            <p className="font-semibold text-gray-900">
              {formatDateTime(selectedSlot.startTime)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Duration:{" "}
              {Math.round(
                (selectedSlot.endTime.getTime() -
                  selectedSlot.startTime.getTime()) /
                  60000
              )}{" "}
              minutes
            </p>
            {appointmentPrice && (
              <p className="text-sm font-semibold text-gray-900 mt-2">
                Price: ${appointmentPrice.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or concerns..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
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
              <div
                className="flex gap-3 pt-4"
                style={{ visibility: "visible", display: "flex" }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || (showPayment && !paymentCompleted)}
                  className="flex-1"
                >
                  {loading ? "Booking..." : "Confirm Booking"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
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
