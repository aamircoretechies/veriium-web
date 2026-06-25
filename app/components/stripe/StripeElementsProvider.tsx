"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { useMemo, type ReactNode } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

interface StripeElementsProviderProps {
  clientSecret: string;
  children: ReactNode;
}

export function StripeElementsProvider({
  clientSecret,
  children,
}: StripeElementsProviderProps) {
  const options = useMemo<StripeElementsOptions>(
    () => ({ clientSecret }),
    [clientSecret],
  );

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
