import { getJobById } from "@/lib/jobs/lookup";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_CURRENCY } from "@/lib/stripe/constants";
import { tipKey } from "@/lib/stripe/idempotency";
import { DriverNotLinkedError } from "./errors";
import { createPaymentRecord, findPaymentByIdempotencyKey } from "./record";

export type TipPaymentLinkResult = {
  url: string;
  paymentRecordId: string;
};

/** Stripe Payment Link for post-job tips (§5.4). */
export async function createTipPaymentLink(
  jobId: string,
  amountDollars: number,
): Promise<TipPaymentLinkResult> {
  if (amountDollars <= 0) {
    throw new Error("Tip amount must be positive");
  }

  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    throw new DriverNotLinkedError(jobId);
  }

  const idempotencyKey = tipKey(jobId);
  const existing = await findPaymentByIdempotencyKey(idempotencyKey);
  if (existing) {
    const stripe = getStripe();
    const links = await stripe.paymentLinks.list({ limit: 100 });
    const match = links.data.find(
      (link) => link.metadata?.jobId === jobId && link.metadata?.paymentType === "tip",
    );
    if (match?.url) {
      return {
        url: match.url,
        paymentRecordId: existing.id,
      };
    }
  }

  const amountCents = Math.round(amountDollars * 100);
  const stripe = getStripe();

  const price = await stripe.prices.create(
    {
      currency: STRIPE_CURRENCY,
      unit_amount: amountCents,
      product_data: {
        name: "Veriium tip",
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
        paymentType: "tip",
      },
    },
    { idempotencyKey },
  );

  if (!paymentLink.url) {
    throw new Error("Stripe Payment Link missing url");
  }

  const record = await createPaymentRecord({
    type: "tip",
    amount: amountDollars,
    status: "pending",
    idempotency_key: idempotencyKey,
    job: [jobId],
    driver: [driverId],
  });

  return {
    url: paymentLink.url,
    paymentRecordId: record.id,
  };
}
