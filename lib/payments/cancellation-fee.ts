import type Stripe from "stripe";

import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { getStripe } from "@/lib/stripe/client";
import {
  CANCELLATION_FEE_CENTS,
  STRIPE_CURRENCY,
} from "@/lib/stripe/constants";
import { cancelKey } from "@/lib/stripe/idempotency";
import { DriverNotLinkedError, StripeCustomerMissingError } from "./errors";
import { resolveDefaultPaymentMethod } from "./payment-method";
import {
  createPaymentRecord,
  findPaymentByJobAndType,
  updatePaymentRecord,
} from "./record";
import { mapStripePaymentStatus } from "./status-map";

export type CancellationFeeIntentResult = {
  paymentIntentId: string;
  paymentRecordId: string;
  status: Stripe.PaymentIntent.Status;
};

/** $50 immediate capture on late cancel / no-show (§7.3). */
export async function createCancellationFeeIntent(
  jobId: string,
): Promise<CancellationFeeIntentResult> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    throw new DriverNotLinkedError(jobId);
  }

  const driver = await getDriverById(driverId);
  const customerId = driver.fields.stripe_customer_id;
  if (!customerId) {
    throw new StripeCustomerMissingError(driverId);
  }

  const idempotencyKey = cancelKey(jobId);
  const existing = await findPaymentByJobAndType(jobId, "cancellation_fee");

  if (existing?.fields.stripe_payment_intent_id) {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(
      existing.fields.stripe_payment_intent_id,
    );
    return {
      paymentIntentId: paymentIntent.id,
      paymentRecordId: existing.id,
      status: paymentIntent.status,
    };
  }

  const amountDollars = CANCELLATION_FEE_CENTS / 100;
  const paymentMethodId = await resolveDefaultPaymentMethod(customerId);
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: CANCELLATION_FEE_CENTS,
      currency: STRIPE_CURRENCY,
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        jobId,
        paymentType: "cancellation_fee",
        paymentAttempt: "initial",
      },
    },
    { idempotencyKey },
  );

  const record = existing
    ? await updatePaymentRecord(existing.id, {
        status: mapStripePaymentStatus(paymentIntent.status),
        stripe_payment_intent_id: paymentIntent.id,
        ...(paymentIntent.status === "succeeded"
          ? { captured_at: new Date().toISOString() }
          : {}),
      })
    : await createPaymentRecord({
        amount: amountDollars,
        type: "cancellation_fee",
        status: mapStripePaymentStatus(paymentIntent.status),
        stripe_payment_intent_id: paymentIntent.id,
        job_id: [jobId],
        ...(paymentIntent.status === "succeeded"
          ? { captured_at: new Date().toISOString() }
          : {}),
      });

  return {
    paymentIntentId: paymentIntent.id,
    paymentRecordId: record.id,
    status: paymentIntent.status,
  };
}
