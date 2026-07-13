import { getStripe } from "@/lib/stripe/client";
import { findPaymentByJobAndType, updatePaymentRecord } from "./record";

export type RefundFinalPaymentResult = {
  paymentIntentId: string;
  action: "canceled" | "refunded";
  status: string;
};

/**
 * Release or refund the manual-capture final PaymentIntent (§9.3).
 * Uncaptured intents are canceled; captured intents are fully refunded.
 */
export async function refundFinalPayment(
  jobId: string,
): Promise<RefundFinalPaymentResult> {
  const existing = await findPaymentByJobAndType(jobId, "final_pi");
  const paymentIntentId = existing?.fields.stripe_payment_intent_id;

  if (!paymentIntentId) {
    throw new Error(`No final payment intent for job ${jobId}`);
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === "canceled") {
    if (existing) {
      await updatePaymentRecord(existing.id, { status: "canceled" });
    }
    return {
      paymentIntentId,
      action: "canceled",
      status: paymentIntent.status,
    };
  }

  if (paymentIntent.status === "requires_capture") {
    const canceled = await stripe.paymentIntents.cancel(paymentIntentId);

    if (existing) {
      await updatePaymentRecord(existing.id, { status: "canceled" });
    }

    return {
      paymentIntentId,
      action: "canceled",
      status: canceled.status,
    };
  }

  if (paymentIntent.status === "succeeded") {
    const refund = await stripe.refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `refund-${jobId}` },
    );

    if (existing) {
      await updatePaymentRecord(existing.id, {
        status: "refunded",
        refunded_at: new Date().toISOString(),
      });
    }

    return {
      paymentIntentId,
      action: "refunded",
      status: refund.status,
    };
  }

  throw new Error(
    `Cannot refund final PaymentIntent ${paymentIntentId} in status ${paymentIntent.status}`,
  );
}
