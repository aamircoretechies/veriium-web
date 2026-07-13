import type Stripe from "stripe";

import type { PaymentStatus } from "@/types/airtable/enums";

/** Map Stripe PaymentIntent / SetupIntent status to Airtable Payments.status. */
export function mapStripePaymentStatus(
  status: Stripe.PaymentIntent.Status | Stripe.SetupIntent.Status,
): PaymentStatus {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "processing":
      return "processing";
    case "canceled":
      return "canceled";
    case "requires_action":
      return "requires_action";
    case "requires_confirmation":
      return "requires_confirmation";
    case "requires_payment_method":
      return "requires_payment_method";
    default:
      return "requires_action";
  }
}
