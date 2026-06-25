import type Stripe from "stripe";

import { getAirtableClient } from "@/lib/airtable";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { beginMatching } from "@/lib/matching/start";
import { getStripe } from "@/lib/stripe/client";
import type { DriverFields } from "@/types/airtable/drivers";
import { updateDriverSchema } from "@/types/airtable/schemas";
import {
  SetupIntentMetadataError,
  SetupIntentNotFoundError,
} from "./errors";
import {
  findPaymentBySetupIntentId,
  updatePaymentRecord,
} from "./record";

export type CompleteSetupResult = {
  jobId: string;
  paymentId: string;
  alreadyCompleted: boolean;
};

/**
 * Handle `setup_intent.succeeded`: persist customer + PM, transition job → `matched`,
 * and kick off matching.
 */
export async function completeSetup(
  setupIntent: Stripe.SetupIntent,
): Promise<CompleteSetupResult> {
  const jobId = setupIntent.metadata?.jobId;
  if (!jobId) {
    throw new SetupIntentMetadataError();
  }

  const payment = await findPaymentBySetupIntentId(setupIntent.id);
  if (!payment) {
    throw new SetupIntentNotFoundError(setupIntent.id);
  }

  if (payment.fields.status === "succeeded") {
    return {
      jobId,
      paymentId: payment.id,
      alreadyCompleted: true,
    };
  }

  const customerId =
    typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id;

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

  if (customerId && paymentMethodId) {
    const stripe = getStripe();
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  const driverId = payment.fields.driver?.[0];
  if (driverId && customerId) {
    const driver = await getDriverById(driverId);
    if (!driver.fields.stripe_customer_id) {
      const updateFields = updateDriverSchema.parse({
        stripe_customer_id: customerId,
      });
      const client = getAirtableClient();
      await client.updateRecord<DriverFields>("drivers", driverId, updateFields, {
        typecast: true,
      });
    }
  }

  await updatePaymentRecord(payment.id, {
    status: "succeeded",
    ...(customerId ? { stripe_customer_id: customerId } : {}),
  });

  const job = await getJobById(jobId);
  if (job.fields.status === "matched_awaiting_payment") {
    await updateJobStatus(jobId, { status: "matched" });
    await beginMatching(jobId);
  }

  return {
    jobId,
    paymentId: payment.id,
    alreadyCompleted: false,
  };
}
