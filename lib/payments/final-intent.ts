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
  findPaymentByIdempotencyKey,
  updatePaymentRecord,
} from "./record";

export type FinalPaymentIntentResult = {
  paymentIntentId: string;
  paymentRecordId: string;
  status: Stripe.PaymentIntent.Status;
  amountCents: number;
};

/** Manual-capture final charge (§5.4) — invoked on DONE in a later phase. */
export async function createFinalPaymentIntent(
  jobId: string,
): Promise<FinalPaymentIntentResult> {
  const job = await getJobById(jobId);
  const finalPrice = job.fields.final_price;

  if (finalPrice === undefined || finalPrice <= 0) {
    throw new FinalPriceMissingError(jobId);
  }

  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    throw new DriverNotLinkedError(jobId);
  }

  const driver = await getDriverById(driverId);
  const customerId = driver.fields.stripe_customer_id;
  if (!customerId) {
    throw new StripeCustomerMissingError(driverId);
  }

  const idempotencyKey = finalKey(jobId);
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
        paymentType: "final",
      },
    },
    { idempotencyKey },
  );

  const record = existing
    ? await updatePaymentRecord(existing.id, {
        status: mapIntentStatus(paymentIntent.status),
        amount: finalPrice,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customerId,
      })
    : await createPaymentRecord({
        type: "final",
        amount: finalPrice,
        status: mapIntentStatus(paymentIntent.status),
        idempotency_key: idempotencyKey,
        stripe_customer_id: customerId,
        stripe_payment_intent_id: paymentIntent.id,
        job: [jobId],
        driver: [driverId],
      });

  return {
    paymentIntentId: paymentIntent.id,
    paymentRecordId: record.id,
    status: paymentIntent.status,
    amountCents,
  };
}

function mapIntentStatus(
  status: Stripe.PaymentIntent.Status,
): "pending" | "processing" | "succeeded" | "failed" | "canceled" | "requires_action" {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "processing":
      return "processing";
    case "canceled":
      return "canceled";
    case "requires_action":
    case "requires_confirmation":
    case "requires_payment_method":
    case "requires_capture":
      return status === "requires_action" ? "requires_action" : "pending";
    default:
      return "failed";
  }
}
