import type Stripe from "stripe";

import {
  createCancellationReviewActionItem,
  createDiagnosticFeeRetryFailedActionItem,
  createPaymentFailedActionItem,
} from "@/lib/action-items/create";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails } from "@/lib/jobs/quote-details";
import { updateJobStatus } from "@/lib/jobs/update";
import { createRecoveryPaymentLink } from "@/lib/payments/recovery-link";
import { schedulePaymentRetry } from "@/lib/payments/schedule-retry";
import {
  createPaymentRecord,
  findPaymentByJobAndType,
  findPaymentByPaymentIntentId,
  updatePaymentRecord,
} from "@/lib/payments/record";
import {
  CANCELLATION_MECHANIC_PAYOUT,
  CANCELLATION_PLATFORM_FEE,
  DIAGNOSTIC_MECHANIC_PAYOUT,
  DIAGNOSTIC_PLATFORM_FEE,
} from "@/lib/stripe/constants";
import { mapStripePaymentStatus } from "@/lib/payments/status-map";
import type { AirtableRecord } from "@/types/airtable/common";
import type { PaymentStatus, PaymentType } from "@/types/airtable/enums";
import type { PaymentFields } from "@/types/airtable/payments";

function normalizePaymentType(raw: string): PaymentType | null {
  switch (raw) {
    case "setup":
      return "setup_intent";
    case "setup_intent":
      return "setup_intent";
    case "final":
    case "final_pi":
    case "final_recovery":
    case "installed_parts":
      return "final_pi";
    case "parts_cancellation":
      return "cancellation_fee";
    case "cancellation_fee":
      return "cancellation_fee";
    case "diagnostic_fee":
      return "diagnostic_fee";
    case "tip":
      return "tip";
    case "refund":
      return "refund";
    default:
      return null;
  }
}

export async function handlePaymentIntentEvent(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const status = mapStripePaymentStatus(paymentIntent.status);

  const payment = await upsertPaymentFromIntent(paymentIntent, status);

  if (event.type === "payment_intent.succeeded") {
    const paymentType = paymentIntent.metadata?.paymentType;
    const jobId = paymentIntent.metadata?.jobId;
    const normalized = paymentType ? normalizePaymentType(paymentType) : null;
    if (jobId && normalized) {
      if (normalized === "final_pi") {
        const job = await getJobById(jobId);
        await updateJobStatus(jobId, {
          quote_details: mergeQuoteDetails(job.fields.quote_details, {
            payout_held: false,
          }),
        });
      }
      await applyPayoutForPaymentType(jobId, normalized);
    }
    return;
  }

  if (event.type === "payment_intent.payment_failed") {
    await handlePaymentFailed(paymentIntent, payment);
  }
}

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  payment: AirtableRecord<PaymentFields>,
): Promise<void> {
  const errorMessage =
    paymentIntent.last_payment_error?.message ?? "Payment failed";

  const jobId = paymentIntent.metadata?.jobId ?? payment.fields.job_id?.[0];
  const paymentTypeRaw =
    paymentIntent.metadata?.paymentType ?? (payment.fields.type ?? undefined);
  const paymentType =
    typeof paymentTypeRaw === "string" ? normalizePaymentType(paymentTypeRaw) : null;

  if (!jobId || !paymentType) {
    return;
  }

  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];

  if (paymentType === "final_pi") {
    await updateJobStatus(jobId, {
      quote_details: mergeQuoteDetails(job.fields.quote_details, {
        payout_held: true,
      }),
    });

    let recoveryUrl: string | undefined;
    try {
      const recovery = await createRecoveryPaymentLink(jobId);
      recoveryUrl = recovery.url;
    } catch (error) {
      console.error(
        `[payments/webhooks/payment-intent] Recovery link failed for job ${jobId}:`,
        error,
      );
    }

    const notes = [
      `PaymentIntent ${paymentIntent.id} (${paymentType}): ${errorMessage}`,
      recoveryUrl ? `Recovery link: ${recoveryUrl}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    await createPaymentFailedActionItem({
      jobId,
      notes,
      ...(driverId ? { driver: [driverId] } : {}),
    });
    return;
  }

  if (
    paymentType === "diagnostic_fee" || paymentType === "cancellation_fee"
  ) {
    const isRetryAttempt = paymentIntent.metadata?.paymentAttempt === "retry";

    if (!isRetryAttempt) {
      await schedulePaymentRetry(jobId, paymentType);
      return;
    }

    if (paymentType === "cancellation_fee") {
      await createCancellationReviewActionItem({
        jobId,
        title: "Cancellation fee retry failed",
        notes: `PaymentIntent ${paymentIntent.id} (${paymentType}): ${errorMessage}`,
        driver: job.fields.driver_id,
        mechanic: job.fields.mechanic_id,
      });
      return;
    }

    await createDiagnosticFeeRetryFailedActionItem({
      jobId,
      notes: `PaymentIntent ${paymentIntent.id} (${paymentType}): ${errorMessage}`,
      ...(driverId ? { driver: [driverId] } : {}),
    });
    return;
  }

  await createPaymentFailedActionItem({
    jobId,
    notes: `PaymentIntent ${paymentIntent.id} (${paymentType}): ${errorMessage}`,
    ...(driverId ? { driver: [driverId] } : {}),
  });
}

async function upsertPaymentFromIntent(
  paymentIntent: Stripe.PaymentIntent,
  status: PaymentStatus,
): Promise<AirtableRecord<PaymentFields>> {
  const jobId = paymentIntent.metadata?.jobId;
  const paymentTypeRaw = paymentIntent.metadata?.paymentType;

  if (!jobId || !paymentTypeRaw) {
    throw new Error("PaymentIntent is missing jobId or paymentType metadata");
  }

  const paymentType = normalizePaymentType(paymentTypeRaw);
  if (!paymentType) {
    throw new Error(`Unknown payment type: ${paymentTypeRaw}`);
  }

  let payment = await findPaymentByPaymentIntentId(paymentIntent.id);
  if (!payment) {
    payment = await findPaymentByJobAndType(jobId, paymentType);
  }

  const amountDollars = paymentIntent.amount / 100;
  const patch = {
    status,
    amount: amountDollars,
    stripe_payment_intent_id: paymentIntent.id,
    ...(status === "succeeded" ? { captured_at: new Date().toISOString() } : {}),
  };

  if (payment) {
    if (
      payment.fields.status === status &&
      payment.fields.stripe_payment_intent_id === paymentIntent.id
    ) {
      return payment;
    }
    return updatePaymentRecord(payment.id, patch);
  }

  return createPaymentRecord({
    type: paymentType,
    amount: amountDollars,
    status,
    stripe_payment_intent_id: paymentIntent.id,
    job_id: [jobId],
  });
}

async function applyPayoutForPaymentType(
  jobId: string,
  paymentType: string,
): Promise<void> {
  switch (paymentType) {
    case "diagnostic_fee":
      await updateJobStatus(jobId, {
        mechanic_payout: DIAGNOSTIC_MECHANIC_PAYOUT,
        platform_fee: DIAGNOSTIC_PLATFORM_FEE,
      });
      break;
    case "cancellation_fee":
      await updateJobStatus(jobId, {
        mechanic_payout: CANCELLATION_MECHANIC_PAYOUT,
        platform_fee: CANCELLATION_PLATFORM_FEE,
      });
      break;
  }
}
