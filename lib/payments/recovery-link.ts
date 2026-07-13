import { getJobById } from "@/lib/jobs/lookup";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_CURRENCY } from "@/lib/stripe/constants";
import { recoveryKey } from "@/lib/stripe/idempotency";
import { FinalPriceMissingError } from "./errors";
import { createPaymentRecord, findPaymentByJobAndType } from "./record";

export type RecoveryPaymentLinkResult = {
  url: string;
  paymentRecordId: string;
};

/** Stripe Payment Link for final charge recovery after off-session failure (Exhibit A §4). */
export async function createRecoveryPaymentLink(
  jobId: string,
): Promise<RecoveryPaymentLinkResult> {
  const job = await getJobById(jobId);
  const finalPrice = job.fields.final_price;

  if (finalPrice === undefined || finalPrice <= 0) {
    throw new FinalPriceMissingError(jobId);
  }

  const idempotencyKey = recoveryKey(jobId);
  const existing = await findPaymentByJobAndType(jobId, "final_pi");
  if (existing) {
    const stripe = getStripe();
    const links = await stripe.paymentLinks.list({ limit: 100 });
    const match = links.data.find(
      (link) =>
        link.metadata?.jobId === jobId &&
        link.metadata?.paymentType === "final_pi",
    );
    if (match?.url) {
      return {
        url: match.url,
        paymentRecordId: existing.id,
      };
    }
  }

  const amountCents = Math.round(finalPrice * 100);
  const stripe = getStripe();

  const price = await stripe.prices.create(
    {
      currency: STRIPE_CURRENCY,
      unit_amount: amountCents,
      product_data: {
        name: "Veriium repair payment",
        metadata: { jobId },
      },
    },
    { idempotencyKey: `${idempotencyKey}-price` },
  );

  const paymentLink = await stripe.paymentLinks.create(
    {
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        jobId,
        paymentType: "final_pi",
      },
    },
    { idempotencyKey },
  );

  if (!paymentLink.url) {
    throw new Error("Stripe Payment Link missing url");
  }

  const record = await createPaymentRecord({
    type: "final_pi",
    amount: finalPrice,
    status: "requires_payment_method",
    job_id: [jobId],
  });

  return {
    url: paymentLink.url,
    paymentRecordId: record.id,
  };
}
