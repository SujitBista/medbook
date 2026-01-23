"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { env } from "@/lib/env";

const stripePromise = env.stripePublishableKey
  ? loadStripe(env.stripePublishableKey)
  : null;

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
}

export function StripeProvider({
  children,
  clientSecret,
}: StripeProviderProps) {
  if (!stripePromise) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
        <p className="text-sm">
          Stripe is not configured. Please set
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable.
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
