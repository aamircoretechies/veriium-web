import type Stripe from "stripe";

import { createPaymentFailedActionItem } from "@/lib/action-items/create";
import { completeSetup } from "@/lib/payments/complete-setup";
import { getJobById } from "@/lib/jobs/lookup";
import {
  findPaymentBySetupIntentId,
  updatePaymentRecord,
} from "@/lib/payments/record";

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

  if (payment.fields.status === "canceled" || payment.fields.status === "succeeded") {
    return;
  }

  const jobId = setupIntent.metadata?.jobId ?? payment.fields.job_id?.[0];
  if (!jobId) {
    return;
  }

  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  const errorMessage =
    setupIntent.last_setup_error?.message ?? "Card setup failed";

  await updatePaymentRecord(payment.id, {
    status: "canceled",
    failed_at: new Date().toISOString(),
    failure_reason: errorMessage,
  });

  await createPaymentFailedActionItem({
    jobId,
    notes: `SetupIntent ${setupIntent.id}: ${errorMessage}`,
    driver: driverId ? [driverId] : undefined,
  });
}
