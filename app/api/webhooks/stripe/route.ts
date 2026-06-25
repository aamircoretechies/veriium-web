import type Stripe from "stripe";

import { getEnv } from "@/config/env";
import { getAirtableClient } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import { dispatchStripeWebhook } from "@/lib/payments/webhooks/dispatch";
import { getStripe } from "@/lib/stripe/client";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { createActionItemSchema } from "@/types/airtable/schemas";

const STRIPE_SIGNATURE_HEADER = "stripe-signature";

async function recordWebhookHandlerError(
  eventId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[api/webhooks/stripe] handler error for ${eventId}:`, error);

  try {
    const actionItemFields = createActionItemSchema.parse({
      type: "payment_failed",
      status: "open",
      title: "Stripe webhook handler failed",
      notes: `Event ${eventId}: ${message}`,
    });
    const client = getAirtableClient();
    await client.createRecord<ActionItemFields>(
      "action-items",
      actionItemFields,
      { typecast: true },
    );
  } catch (actionItemError) {
    console.error(
      "[api/webhooks/stripe] failed to create action item:",
      actionItemError,
    );
  }
}

export async function POST(request: Request) {
  const env = getEnv();
  const signature = request.headers.get(STRIPE_SIGNATURE_HEADER);

  if (!signature) {
    return jsonError(400, "missing_signature", "Missing Stripe signature header.");
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return jsonError(400, "invalid_body", "Could not read request body.");
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";
    return jsonError(400, "invalid_signature", message);
  }

  try {
    await dispatchStripeWebhook(event);
  } catch (error) {
    await recordWebhookHandlerError(event.id, error);
  }

  return jsonOk({ received: true });
}
