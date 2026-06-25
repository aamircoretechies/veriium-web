import type Stripe from "stripe";

import { getAirtableClient } from "@/lib/airtable";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  findPaymentByChargeId,
  findPaymentByPaymentIntentId,
} from "@/lib/payments/record";
import { getStripe } from "@/lib/stripe/client";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { createActionItemSchema } from "@/types/airtable/schemas";

export async function handleDisputeCreated(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId =
    typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

  if (!chargeId) {
    return;
  }

  let jobId: string | undefined;
  let driverId: string | undefined;

  const payment = await findPaymentByChargeId(chargeId);
  if (payment) {
    jobId = payment.fields.job?.[0];
    driverId = payment.fields.driver?.[0];
  } else {
    const stripe = getStripe();
    const charge = await stripe.charges.retrieve(chargeId);
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (paymentIntentId) {
      const paymentByIntent = await findPaymentByPaymentIntentId(paymentIntentId);
      if (paymentByIntent) {
        jobId = paymentByIntent.fields.job?.[0];
        driverId = paymentByIntent.fields.driver?.[0];
      } else {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        jobId = paymentIntent.metadata?.jobId;
      }
    }
  }

  const actionItemFields = createActionItemSchema.parse({
    type: "charge_dispute",
    status: "open",
    title: "Stripe charge dispute opened",
    notes: `Dispute ${dispute.id} on charge ${chargeId}. Reason: ${dispute.reason ?? "unknown"}.`,
    ...(jobId ? { job: [jobId] } : {}),
    ...(driverId ? { driver: [driverId] } : {}),
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });

  if (!jobId) {
    return;
  }

  const job = await getJobById(jobId);
  if (job.fields.status === "disputed") {
    return;
  }

  await updateJobStatus(jobId, {
    status: "disputed",
    disputed_at: new Date().toISOString(),
  });
}
