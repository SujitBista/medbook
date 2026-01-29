"use client";

import { useState, useEffect, useRef } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@medbook/ui";

interface PaymentFormProps {
  amount: number; // Amount in dollars
  paymentIntentId: string;
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export function PaymentForm({
  amount,
  paymentIntentId,
  clientSecret,
  onSuccess,
  onError,
  onCancel,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  // Only call onSuccess once per payment intent when status is "succeeded"
  const successHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Check if payment intent requires action (e.g. on mount or return from 3DS)
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) return;
      // Don't overwrite with error if we already handled success (avoids race where
      // retrievePaymentIntent returns stale status after confirmPayment succeeded)
      if (successHandledRef.current === paymentIntentId) return;

      switch (paymentIntent.status) {
        case "succeeded":
          setMessage("Payment successful!");
          setPaymentComplete(true);
          setIsProcessing(false);
          if (successHandledRef.current !== paymentIntentId) {
            successHandledRef.current = paymentIntentId;
            onSuccess(paymentIntentId);
          }
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe, clientSecret, paymentIntentId, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/appointments`,
        },
        redirect: "if_required",
      });

      if (error) {
        setMessage(error.message || "An error occurred");
        onError(error.message || "Payment failed");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        successHandledRef.current = paymentIntentId;
        setMessage("Payment successful!");
        setPaymentComplete(true);
        setIsProcessing(false);
        onSuccess(paymentIntentId);
      } else {
        setMessage("Unexpected payment status");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("[PaymentForm] Error confirming payment:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setMessage(errorMessage);
      onError(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Total Amount
          </span>
          <span className="text-lg font-bold text-gray-900">
            ${amount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            message.includes("successful") || message.includes("processing")
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={!stripe || !elements || isProcessing || paymentComplete}
          className="flex-1"
        >
          {paymentComplete
            ? "Redirecting..."
            : isProcessing
              ? "Processing..."
              : `Pay $${amount.toFixed(2)}`}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing || paymentComplete}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
