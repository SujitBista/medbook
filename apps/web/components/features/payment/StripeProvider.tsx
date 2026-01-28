"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { env } from "@/lib/env";
import { useMemo } from "react";

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
}

export function StripeProvider({
  children,
  clientSecret,
}: StripeProviderProps) {
  // Check env variable at runtime, not at module load time
  const stripePublishableKey = env.stripePublishableKey;

  // Create stripe promise only when we have a key
  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) {
      return null;
    }
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  if (!stripePublishableKey || !stripePromise) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
        <p className="text-sm">
          Stripe is not configured. Please set{" "}
          <strong>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</strong> environment
          variable.
        </p>
        <p className="text-xs mt-2 text-yellow-700">
          Current value: {stripePublishableKey || "undefined"} (length:{" "}
          {stripePublishableKey?.length || 0})
        </p>
      </div>
    );
  }

  if (!clientSecret) {
    return <>{children}</>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      {children}
    </Elements>
  );
}
