import { getOrCreateStripeCustomer } from "@/lib/drivers/stripe-customer";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { getStripe } from "@/lib/stripe/client";
import { setupKey } from "@/lib/stripe/idempotency";
import {
  DriverNotLinkedError,
  JobNotPayableError,
  PaymentAlreadyCompletedError,
} from "./errors";
import {
  createPaymentRecord,
  findPaymentByJobAndType,
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

export async function createSetupIntentForJob(
  jobId: string,
): Promise<SetupIntentResult> {
  const job = await getJobById(jobId);
  const status = job.fields.status;

  if (
    status !== JOB_STATUS.draft &&
    status !== JOB_STATUS.matched_awaiting_payment
  ) {
    throw new JobNotPayableError(jobId, jobStatusOr(status));
  }

  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    throw new DriverNotLinkedError(jobId);
  }

  const existingPayment = await findPaymentByJobAndType(jobId, "setup_intent");

  if (existingPayment?.fields.status === "succeeded") {
    throw new PaymentAlreadyCompletedError(jobId);
  }

  if (
    status === JOB_STATUS.matched_awaiting_payment &&
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

  if (status === JOB_STATUS.draft) {
    await updateJobStatus(jobId, {
      status: JOB_STATUS.matched_awaiting_payment,
      policy_disclosed_at: now,
    });
  }

  const driver = await getDriverById(driverId);
  const stripeCustomerId = await getOrCreateStripeCustomer({
    driverId,
    phone: driver.fields.phone_number!,
    name: driver.fields.name,
  });

  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.create(
    {
      customer: stripeCustomerId,
      usage: "off_session",
      metadata: { jobId },
    },
    { idempotencyKey: setupKey(jobId) },
  );

  if (!setupIntent.client_secret) {
    throw new Error(`Stripe SetupIntent ${setupIntent.id} missing client_secret`);
  }

  await createPaymentRecord({
    type: "setup_intent",
    amount: 0,
    status: "requires_payment_method",
    stripe_setup_intent_id: setupIntent.id,
    job_id: [jobId],
  });

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
  };
}
