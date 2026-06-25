import Stripe from "stripe";

import { getEnv } from "@/config/env";

let cachedStripe: Stripe | undefined;
let testStripeOverride: Stripe | undefined;

/** Replace the singleton client (payment manual tests). Pass `undefined` to reset. */
export function setStripeClientForTests(client: Stripe | undefined): void {
  testStripeOverride = client;
  cachedStripe = client;
}

/** Lazily constructed singleton Stripe server client. */
export function getStripe(): Stripe {
  if (testStripeOverride) {
    return testStripeOverride;
  }
  if (!cachedStripe) {
    const env = getEnv();
    cachedStripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return cachedStripe;
}
