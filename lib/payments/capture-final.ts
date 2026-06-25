import { getStripe } from "@/lib/stripe/client";
import { finalKey } from "@/lib/stripe/idempotency";
import { findPaymentByIdempotencyKey, updatePaymentRecord } from "./record";

export type CaptureFinalPaymentResult = {
  paymentIntentId: string;
  status: string;
};

/** Capture the manual-capture final PaymentIntent after driver confirms (§9.3). */
export async function captureFinalPayment(
  jobId: string,
): Promise<CaptureFinalPaymentResult> {
  const existing = await findPaymentByIdempotencyKey(finalKey(jobId));
  const paymentIntentId = existing?.fields.stripe_payment_intent_id;

  if (!paymentIntentId) {
    throw new Error(`No final payment intent for job ${jobId}`);
  }

  const stripe = getStripe();
  const current = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (current.status === "succeeded") {
    return {
      paymentIntentId: current.id,
      status: current.status,
    };
  }

  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

  if (existing) {
    await updatePaymentRecord(existing.id, {
      status: "succeeded",
      captured_at: new Date().toISOString(),
    });
  }

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
  };
}
