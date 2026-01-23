"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Check if payment intent requires action
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent) {
        switch (paymentIntent.status) {
          case "succeeded":
            onSuccess(paymentIntentId);
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
        setMessage("Payment successful!");
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
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
