"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  const isCompletingRef = useRef(false);

  const [amount, setAmount] = useState<number | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [status, session?.user?.id]);

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
          amount: appointmentPrice, // Amount in dollars, backend will convert to cents
          currency: "usd",
          // appointmentId is optional - will be set after appointment creation
          patientId: session?.user?.id,
          doctorId: doctorId,
        }),
      });

      let intentData: {
        success?: boolean;
        data?: {
          paymentIntentId?: string;
          clientSecret?: string;
        };
        error?: {
          code?: string;
          message?: string;
        };
        message?: string;
      };
      try {
        const responseText = await intentResponse.text();
        if (!responseText) {
          throw new Error("Empty response from payment service");
        }
        intentData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[PaymentPage] Failed to parse response:", parseError);
        console.error("[PaymentPage] Response status:", intentResponse.status);
        console.error(
          "[PaymentPage] Response headers:",
          Object.fromEntries(intentResponse.headers.entries())
        );
        throw new Error(
          "Invalid response from payment service. Please try again."
        );
      }

      // Check if response is not OK or if success flag is false/undefined
      if (!intentResponse.ok) {
        // Log full response for debugging
        console.error(
          "[PaymentPage] Payment intent creation failed (HTTP error):",
          {
            status: intentResponse.status,
            statusText: intentResponse.statusText,
            ok: intentResponse.ok,
            response: intentData,
          }
        );

        // Extract error message from various possible formats
        const errorMessage =
          intentData?.error?.message ||
          intentData?.error?.code ||
          intentData?.message ||
          (intentData?.error && typeof intentData.error === "string"
            ? intentData.error
            : null) ||
          `Payment service returned error (${intentResponse.status})`;

        throw new Error(errorMessage);
      }

      // Check if success flag is explicitly false or missing
      if (
        intentData.success === false ||
        (intentData.success === undefined && !intentData.data)
      ) {
        // Log full response for debugging
        console.error(
          "[PaymentPage] Payment intent creation failed (success=false):",
          {
            status: intentResponse.status,
            success: intentData.success,
            error: intentData.error,
            message: intentData.message,
            fullResponse: JSON.stringify(intentData, null, 2),
          }
        );

        // Extract error message from various possible formats
        const errorMessage =
          intentData?.error?.message ||
          intentData?.error?.code ||
          intentData?.message ||
          (intentData?.error && typeof intentData.error === "string"
            ? intentData.error
            : null) ||
          "Failed to initialize payment";

        throw new Error(errorMessage);
      }

      if (!intentData.data?.paymentIntentId || !intentData.data?.clientSecret) {
        throw new Error(
          "Payment intent created but missing required data (paymentIntentId or clientSecret)"
        );
      }

      setPaymentIntentId(intentData.data.paymentIntentId);
      setClientSecret(intentData.data.clientSecret);
    } catch (err) {
      console.error("[PaymentPage] Error initializing payment:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to initialize payment. Please try again.";
      console.error("[PaymentPage] Error details:", {
        error: errorMessage,
        doctorId,
        slotId,
        availabilityId,
        hasSession: !!session?.user?.id,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = useCallback(
    async (piId: string) => {
      if (isCompletingRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[PaymentPage] Ignoring duplicate handlePaymentSuccess");
        }
        return;
      }
      if (!session?.user?.id || !doctorId || !slotId || !availabilityId) {
        setError("Missing required information to complete booking");
        return;
      }

      isCompletingRef.current = true;
      try {
        setError(null);

        // Create the appointment with payment intent ID (patientId from session on server)
        const appointmentResponse = await fetch("/api/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            doctorId: doctorId,
            availabilityId: availabilityId,
            slotId: slotId,
            startTime: startTime,
            endTime: endTime,
            paymentIntentId: piId,
          }),
        });

        const appointmentStatus = appointmentResponse.status;
        const appointmentStatusText = appointmentResponse.statusText;
        const responseText = await appointmentResponse.text();

        let appointmentData: {
          success?: boolean;
          data?: { id?: string };
          error?: { message?: string };
        };
        try {
          appointmentData =
            responseText.length > 0 ? JSON.parse(responseText) : {};
        } catch (parseErr) {
          console.error(
            "[PaymentPage] POST /api/appointments parse failed:",
            parseErr
          );
          console.error("[PaymentPage] Response text:", responseText);
          throw new Error(
            `Booking failed (${appointmentStatus} ${appointmentStatusText}). Invalid response from server.`
          );
        }

        if (!appointmentResponse.ok) {
          const msg =
            appointmentData?.error?.message ||
            responseText ||
            `${appointmentStatus} ${appointmentStatusText}`;
          console.error("[PaymentPage] POST /api/appointments not ok:", {
            status: appointmentStatus,
            statusText: appointmentStatusText,
            body: appointmentData,
            responseText,
          });
          throw new Error(msg);
        }

        if (!appointmentData.success) {
          const msg =
            appointmentData?.error?.message ||
            "Booking was not successful. Please try again.";
          throw new Error(msg);
        }

        // Update payment with appointment ID
        if (appointmentData.data?.id) {
          const confirmResponse = await fetch("/api/payments/confirm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              paymentIntentId: piId,
              appointmentId: appointmentData.data.id,
            }),
          });

          const confirmStatus = confirmResponse.status;
          const confirmStatusText = confirmResponse.statusText;
          const confirmText = await confirmResponse.text();

          let confirmData: {
            success?: boolean;
            error?: { message?: string };
          } = {};
          try {
            confirmData = confirmText.length > 0 ? JSON.parse(confirmText) : {};
          } catch (confirmParseErr) {
            console.error(
              "[PaymentPage] POST /api/payments/confirm parse failed:",
              confirmParseErr
            );
            console.error("[PaymentPage] Confirm response text:", confirmText);
            // Don't block redirect; booking succeeded
          }

          if (!confirmResponse.ok) {
            console.error(
              "[PaymentPage] POST /api/payments/confirm failed:",
              confirmStatus,
              confirmStatusText,
              confirmData,
              confirmText
            );
            // Don't throw; booking is already created
          } else if (confirmData?.success === false) {
            console.error(
              "[PaymentPage] POST /api/payments/confirm success=false:",
              confirmData
            );
          }
        }

        router.push(returnUrl);
      } catch (err) {
        console.error("[PaymentPage] Error completing booking:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to complete booking. Please try again."
        );
      } finally {
        isCompletingRef.current = false;
      }
    },
    [
      session?.user?.id,
      doctorId,
      slotId,
      availabilityId,
      startTime,
      endTime,
      returnUrl,
      router,
    ]
  );

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
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
