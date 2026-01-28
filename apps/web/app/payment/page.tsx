"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, Button } from "@medbook/ui";
import { PaymentForm } from "@/components/features/payment/PaymentForm";
import { StripeProvider } from "@/components/features/payment/StripeProvider";
import Link from "next/link";

function PaymentFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [amount, setAmount] = useState<number | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Get appointment details from query params
  const doctorId = searchParams.get("doctorId");
  const slotId = searchParams.get("slotId");
  const availabilityId = searchParams.get("availabilityId");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const returnUrl = searchParams.get("returnUrl") || "/appointments";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(
          `/payment?${searchParams.toString()}`
        )}`
      );
      return;
    }

    if (status === "authenticated" && session?.user?.id) {
      initializePayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const initializePayment = async () => {
    if (!doctorId || !slotId || !availabilityId || !startTime || !endTime) {
      setError("Missing required appointment details");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, get the appointment price
      const priceResponse = await fetch(`/api/doctors/${doctorId}/price`, {
        cache: "no-store",
      });

      if (!priceResponse.ok) {
        throw new Error("Failed to fetch appointment price");
      }

      const priceData = await priceResponse.json();
      if (!priceData.success || !priceData.data?.appointmentPrice) {
        throw new Error("Appointment price not available");
      }

      const appointmentPrice = priceData.data.appointmentPrice;
      setAmount(appointmentPrice);

      // Create payment intent
      const intentResponse = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: appointmentPrice,
          currency: "usd",
          appointmentId: "", // Will be set after appointment creation
          patientId: session?.user?.id,
          doctorId: doctorId,
        }),
      });

      const intentData = await intentResponse.json();

      if (!intentResponse.ok || !intentData.success) {
        throw new Error(
          intentData.error?.message || "Failed to initialize payment"
        );
      }

      setPaymentIntentId(intentData.data.paymentIntentId);
      setClientSecret(intentData.data.clientSecret);
    } catch (err) {
      console.error("[PaymentPage] Error initializing payment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initialize payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (piId: string) => {
    if (!session?.user?.id || !doctorId || !slotId || !availabilityId) {
      setError("Missing required information to complete booking");
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // First confirm the payment
      const confirmResponse = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId: piId,
          appointmentId: "", // Will be set after appointment creation
        }),
      });

      if (!confirmResponse.ok) {
        const confirmData = await confirmResponse.json();
        throw new Error(
          confirmData.error?.message || "Failed to confirm payment"
        );
      }

      // Create the appointment
      const appointmentResponse = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: session.user.id,
          doctorId: doctorId,
          availabilityId: availabilityId,
          slotId: slotId,
          startTime: startTime,
          endTime: endTime,
        }),
      });

      const appointmentData = await appointmentResponse.json();

      if (!appointmentResponse.ok || !appointmentData.success) {
        throw new Error(
          appointmentData.error?.message ||
            "Failed to book appointment. Please try again."
        );
      }

      // Update payment with appointment ID
      if (appointmentData.data.id) {
        await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: piId,
            appointmentId: appointmentData.data.id,
          }),
        });
      }

      // Redirect to appointments page or return URL
      router.push(returnUrl);
    } catch (err) {
      console.error("[PaymentPage] Error completing booking:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete booking. Please try again."
      );
      setProcessing(false);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setProcessing(false);
  };

  const handleCancel = () => {
    if (doctorId) {
      router.push(`/doctors/${doctorId}`);
    } else {
      router.push("/doctors");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error && !amount) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleCancel}>
                Go Back
              </Button>
              <Button variant="primary" onClick={initializePayment}>
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!amount || !clientSecret || !paymentIntentId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Unable to initialize payment. Please try again.
            </p>
            <Button variant="primary" onClick={handleCancel}>
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card title="Complete Payment">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Appointment Details</p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Date & Time:</span>{" "}
              {startTime
                ? new Date(startTime).toLocaleString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "N/A"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Duration:</span>{" "}
              {startTime && endTime
                ? Math.round(
                    (new Date(endTime).getTime() -
                      new Date(startTime).getTime()) /
                      60000
                  )
                : "N/A"}{" "}
              minutes
            </p>
          </div>
        </div>

        <StripeProvider clientSecret={clientSecret}>
          <PaymentForm
            amount={amount}
            paymentIntentId={paymentIntentId}
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handleCancel}
          />
        </StripeProvider>

        <div className="mt-6 text-center">
          <Link
            href={doctorId ? `/doctors/${doctorId}` : "/doctors"}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to doctor profile
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading payment...</p>
          </div>
        </div>
      }
    >
      <PaymentFormContent />
    </Suspense>
  );
}
