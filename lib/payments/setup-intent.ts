import { getOrCreateStripeCustomer } from "@/lib/drivers/stripe-customer";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { getStripe } from "@/lib/stripe/client";
import { setupKey } from "@/lib/stripe/idempotency";
import {
  DriverNotLinkedError,
  JobNotPayableError,
  PaymentAlreadyCompletedError,
} from "./errors";
import {
  createPaymentRecord,
  findPaymentByIdempotencyKey,
} from "./record";

export type SetupIntentResult = {
  clientSecret: string;
  setupIntentId: string;
};

const REUSABLE_SETUP_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

/**
 * Orchestrate card-save SetupIntent flow (§5.4).
 *
 * - `draft` → `matched_awaiting_payment` with policy timestamp before Stripe call
 * - Idempotent retry in `matched_awaiting_payment` returns the existing SetupIntent
 */
export async function createSetupIntentForJob(
  jobId: string,
): Promise<SetupIntentResult> {
  const job = await getJobById(jobId);
  const status = job.fields.status;

  if (status !== "draft" && status !== "matched_awaiting_payment") {
    throw new JobNotPayableError(jobId, status);
  }

  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    throw new DriverNotLinkedError(jobId);
  }

  const idempotencyKey = setupKey(jobId);
  const existingPayment = await findPaymentByIdempotencyKey(idempotencyKey);

  if (existingPayment?.fields.status === "succeeded") {
    throw new PaymentAlreadyCompletedError(jobId);
  }

  if (
    status === "matched_awaiting_payment" &&
    existingPayment?.fields.stripe_setup_intent_id
  ) {
    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.retrieve(
      existingPayment.fields.stripe_setup_intent_id,
    );

    if (setupIntent.status === "succeeded") {
      throw new PaymentAlreadyCompletedError(jobId);
    }

    if (
      setupIntent.client_secret &&
      REUSABLE_SETUP_STATUSES.has(setupIntent.status)
    ) {
      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      };
    }
  }

  const now = new Date().toISOString();

  if (status === "draft") {
    await updateJobStatus(jobId, {
      status: "matched_awaiting_payment",
      cancellation_policy_accepted_at: now,
      payment_setup_at: now,
    });
  }

  const driver = await getDriverById(driverId);
  const stripeCustomerId = await getOrCreateStripeCustomer({
    driverId,
    phone: driver.fields.phone,
    name: driver.fields.name,
  });

  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage: "off_session",
    metadata: { jobId },
  });

  if (!setupIntent.client_secret) {
    throw new Error(`Stripe SetupIntent ${setupIntent.id} missing client_secret`);
  }

  await createPaymentRecord({
    type: "setup",
    amount: 0,
    status: "pending",
    idempotency_key: idempotencyKey,
    stripe_customer_id: stripeCustomerId,
    stripe_setup_intent_id: setupIntent.id,
    job: [jobId],
    driver: [driverId],
  });

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
  };
}
