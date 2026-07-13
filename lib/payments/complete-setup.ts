import type Stripe from "stripe";

import { getAirtableClient } from "@/lib/airtable";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { JOB_STATUS } from "@/lib/jobs/status";
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

  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (driverId && customerId) {
    const driver = await getDriverById(driverId);
    if (!driver.fields.stripe_customer_id) {
      const updateFields = updateDriverSchema.parse({
        stripe_customer_id: customerId,
      });
      const client = getAirtableClient();
      await client.updateRecord<DriverFields>(
        "drivers",
        driverId,
        updateFields,
        { typecast: true },
      );
    }
  }

  await updatePaymentRecord(payment.id, {
    status: "succeeded",
  });

  if (job.fields.status === JOB_STATUS.matched_awaiting_payment) {
    const now = new Date().toISOString();
    await updateJobStatus(jobId, {
      status: JOB_STATUS.matched_awaiting_response,
      match_tier: 1,
      match_tier_started_at: now,
    });
    await beginMatching(jobId);
  }

  return {
    jobId,
    paymentId: payment.id,
    alreadyCompleted: false,
  };
}
