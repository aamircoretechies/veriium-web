import type Stripe from "stripe";

import { getAirtableClient } from "@/lib/airtable";
import { getJobById } from "@/lib/jobs/lookup";
import { JOB_STATUS } from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import { findPaymentByPaymentIntentId } from "@/lib/payments/record";
import { getStripe } from "@/lib/stripe/client";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { createActionItemSchema } from "@/types/airtable/schemas";
import { ACTION_ITEM_TYPE } from "@/types/airtable/enums";

export async function handleDisputeCreated(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId =
    typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

  if (!chargeId) {
    return;
  }

  let jobId: string | undefined;

  const stripe = getStripe();
  const charge = await stripe.charges.retrieve(chargeId);
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (paymentIntentId) {
    const paymentByIntent = await findPaymentByPaymentIntentId(paymentIntentId);
    if (paymentByIntent) {
      jobId = paymentByIntent.fields.job_id?.[0];
    } else {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      jobId = paymentIntent.metadata?.jobId;
    }
  }

  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.OPEN_DISPUTE,
    status: "open",
    description: `Dispute ${dispute.id} on charge ${chargeId}. Reason: ${dispute.reason ?? "unknown"}.`,
    ...(jobId ? { linked_job_id: [jobId] } : {}),
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });

  if (!jobId) {
    return;
  }

  const job = await getJobById(jobId);
  if (job.fields.status === JOB_STATUS.disputed) {
    return;
  }

  await updateJobStatus(jobId, {
    status: JOB_STATUS.disputed,
  });
}
