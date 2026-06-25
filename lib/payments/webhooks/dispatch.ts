import type Stripe from "stripe";

import { handleDisputeCreated } from "./dispute";
import { handlePaymentIntentEvent } from "./payment-intent";
import { handleSetupIntentEvent } from "./setup-intent";

/** Route Stripe webhook events to typed handlers (§10.3). */
export async function dispatchStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "setup_intent.succeeded":
    case "setup_intent.setup_failed":
      await handleSetupIntentEvent(event);
      return;
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
      await handlePaymentIntentEvent(event);
      return;
    case "charge.dispute.created":
      await handleDisputeCreated(event);
      return;
    default:
      return;
  }
}
