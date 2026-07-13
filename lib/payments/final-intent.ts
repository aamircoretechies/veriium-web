import type Stripe from "stripe";

import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_CURRENCY } from "@/lib/stripe/constants";
import { finalKey } from "@/lib/stripe/idempotency";
import {
  DriverNotLinkedError,
  FinalPriceMissingError,
  StripeCustomerMissingError,
} from "./errors";
import { resolveDefaultPaymentMethod } from "./payment-method";
import {
  createPaymentRecord,
  findPaymentByJobAndType,
  updatePaymentRecord,
} from "./record";
import { mapStripePaymentStatus } from "./status-map";

export type FinalPaymentIntentResult = {
  paymentIntentId: string;
  paymentRecordId: string;
  status: Stripe.PaymentIntent.Status;
  amountCents: number;
};

export async function createFinalPaymentIntent(
  jobId: string,
): Promise<FinalPaymentIntentResult> {
  const job = await getJobById(jobId);
  const finalPrice = job.fields.final_price;

  if (finalPrice === undefined || finalPrice <= 0) {
    throw new FinalPriceMissingError(jobId);
  }

  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    throw new DriverNotLinkedError(jobId);
  }

  const driver = await getDriverById(driverId);
  const customerId = driver.fields.stripe_customer_id;
  if (!customerId) {
    throw new StripeCustomerMissingError(driverId);
  }

  const existing = await findPaymentByJobAndType(jobId, "final_pi");

  if (existing?.fields.stripe_payment_intent_id) {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(
      existing.fields.stripe_payment_intent_id,
    );
    return {
      paymentIntentId: paymentIntent.id,
      paymentRecordId: existing.id,
      status: paymentIntent.status,
      amountCents: paymentIntent.amount,
    };
  }

  const amountCents = Math.round(finalPrice * 100);
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
      capture_method: "manual",
      metadata: {
        jobId,
        paymentType: "final_pi",
      },
    },
    { idempotencyKey: finalKey(jobId) },
  );

  const record = existing
    ? await updatePaymentRecord(existing.id, {
        status: mapStripePaymentStatus(paymentIntent.status),
        amount: finalPrice,
        stripe_payment_intent_id: paymentIntent.id,
      })
    : await createPaymentRecord({
        type: "final_pi",
        amount: finalPrice,
        status: mapStripePaymentStatus(paymentIntent.status),
        stripe_payment_intent_id: paymentIntent.id,
        job_id: [jobId],
      });

  return {
    paymentIntentId: paymentIntent.id,
    paymentRecordId: record.id,
    status: paymentIntent.status,
    amountCents,
  };
}
