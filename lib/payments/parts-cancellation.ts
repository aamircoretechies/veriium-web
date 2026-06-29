import type Stripe from "stripe";

import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_CURRENCY } from "@/lib/stripe/constants";
import { partsCancelKey } from "@/lib/stripe/idempotency";
import { DriverNotLinkedError, StripeCustomerMissingError } from "./errors";
import { resolveDefaultPaymentMethod } from "./payment-method";
import {
  createPaymentRecord,
  findPaymentByIdempotencyKey,
  updatePaymentRecord,
} from "./record";

export type PartsCancellationIntentResult = {
  paymentIntentId: string;
  paymentRecordId: string;
  status: Stripe.PaymentIntent.Status;
  amountDollars: number;
};

/** Immediate capture for installed parts on post-approve cancel (Exhibit A §5.6). */
export async function createPartsCancellationIntent(
  jobId: string,
  amountDollars: number,
): Promise<PartsCancellationIntentResult | null> {
  if (amountDollars <= 0) {
    return null;
  }

  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    throw new DriverNotLinkedError(jobId);
  }

  const driver = await getDriverById(driverId);
  const customerId = driver.fields.stripe_customer_id;
  if (!customerId) {
    throw new StripeCustomerMissingError(driverId);
  }

  const idempotencyKey = partsCancelKey(jobId);
  const existing = await findPaymentByIdempotencyKey(idempotencyKey);

  if (existing?.fields.stripe_payment_intent_id) {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(
      existing.fields.stripe_payment_intent_id,
    );
    return {
      paymentIntentId: paymentIntent.id,
      paymentRecordId: existing.id,
      status: paymentIntent.status,
      amountDollars,
    };
  }

  const amountCents = Math.round(amountDollars * 100);
  const paymentMethodId = await resolveDefaultPaymentMethod(customerId);
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: STRIPE_CURRENCY,
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        jobId,
        paymentType: "parts_cancellation",
      },
    },
    { idempotencyKey },
  );

  const record = existing
    ? await updatePaymentRecord(existing.id, {
        status: paymentIntent.status === "succeeded" ? "succeeded" : "processing",
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customerId,
        amount: amountDollars,
        ...(paymentIntent.status === "succeeded"
          ? { captured_at: new Date().toISOString() }
          : {}),
      })
    : await createPaymentRecord({
        type: "parts_cancellation",
        amount: amountDollars,
        status: paymentIntent.status === "succeeded" ? "succeeded" : "processing",
        idempotency_key: idempotencyKey,
        stripe_customer_id: customerId,
        stripe_payment_intent_id: paymentIntent.id,
        job: [jobId],
        driver: [driverId],
        ...(paymentIntent.status === "succeeded"
          ? { captured_at: new Date().toISOString() }
          : {}),
      });

  return {
    paymentIntentId: paymentIntent.id,
    paymentRecordId: record.id,
    status: paymentIntent.status,
    amountDollars,
  };
}
