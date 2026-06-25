import type Stripe from "stripe";

import { getAirtableClient } from "@/lib/airtable";
import { completeSetup } from "@/lib/payments/complete-setup";
import {
  findPaymentBySetupIntentId,
  updatePaymentRecord,
} from "@/lib/payments/record";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { createActionItemSchema } from "@/types/airtable/schemas";

export async function handleSetupIntentEvent(event: Stripe.Event): Promise<void> {
  const setupIntent = event.data.object as Stripe.SetupIntent;

  if (event.type === "setup_intent.succeeded") {
    await completeSetup(setupIntent);
    return;
  }

  if (event.type === "setup_intent.setup_failed") {
    await handleSetupFailed(setupIntent);
  }
}

async function handleSetupFailed(setupIntent: Stripe.SetupIntent): Promise<void> {
  const payment = await findPaymentBySetupIntentId(setupIntent.id);
  if (!payment) {
    return;
  }

  if (payment.fields.status === "failed" || payment.fields.status === "succeeded") {
    return;
  }

  await updatePaymentRecord(payment.id, { status: "failed" });

  const jobId = setupIntent.metadata?.jobId ?? payment.fields.job?.[0];
  const driverId = payment.fields.driver?.[0];
  const errorMessage =
    setupIntent.last_setup_error?.message ?? "Card setup failed";

  const actionItemFields = createActionItemSchema.parse({
    type: "payment_failed",
    status: "open",
    title: "Payment setup failed",
    notes: `SetupIntent ${setupIntent.id}: ${errorMessage}`,
    ...(jobId ? { job: [jobId] } : {}),
    ...(driverId ? { driver: [driverId] } : {}),
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });
}
