import type Stripe from "stripe";

import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  createCancellationReviewActionItem,
  createDiagnosticFeeRetryFailedActionItem,
} from "@/lib/action-items/create";
import { getStripe } from "@/lib/stripe/client";
import {
  CANCELLATION_FEE_CENTS,
  DIAGNOSTIC_FEE_CENTS,
  STRIPE_CURRENCY,
} from "@/lib/stripe/constants";
import {
  cancelKey,
  diagnosticKey,
  paymentRetryKey,
} from "@/lib/stripe/idempotency";
import { resolveDefaultPaymentMethod } from "./payment-method";
import {
  findPaymentByIdempotencyKey,
  updatePaymentRecord,
} from "./record";
import type { PaymentRetryPayload } from "@/types/api/service";

export type PaymentRetryResult = {
  jobId: string;
  paymentType: PaymentRetryPayload["paymentType"];
  skipped?: boolean;
  reason?: string;
  action?: "retried" | "escalated";
};

const RETRYABLE_PI_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

function baseKeyForType(
  jobId: string,
  paymentType: PaymentRetryPayload["paymentType"],
): string {
  return paymentType === "diagnostic_fee"
    ? diagnosticKey(jobId)
    : cancelKey(jobId);
}

function amountCentsForType(
  paymentType: PaymentRetryPayload["paymentType"],
): number {
  return paymentType === "diagnostic_fee"
    ? DIAGNOSTIC_FEE_CENTS
    : CANCELLATION_FEE_CENTS;
}

async function escalatePaymentRetryFailure(
  jobId: string,
  paymentType: PaymentRetryPayload["paymentType"],
  errorMessage: string,
): Promise<void> {
  const job = await getJobById(jobId);

  if (paymentType === "cancellation_fee") {
    await createCancellationReviewActionItem({
      jobId,
      title: "Cancellation fee retry failed",
      notes: `Off-session cancellation fee retry failed for job ${jobId}: ${errorMessage}`,
      driver: job.fields.driver,
      mechanic: job.fields.mechanic,
    });
    return;
  }

  await createDiagnosticFeeRetryFailedActionItem({
    jobId,
    notes: `Off-session diagnostic fee retry failed for job ${jobId}: ${errorMessage}`,
    driver: job.fields.driver,
  });
}

/**
 * QStash worker — retry failed off-session diagnostic/cancellation charge (Exhibit A §4).
 */
export async function runPaymentRetry(
  jobId: string,
  paymentType: PaymentRetryPayload["paymentType"],
): Promise<PaymentRetryResult> {
  const baseKey = baseKeyForType(jobId, paymentType);
  const payment =
    (await findPaymentByIdempotencyKey(paymentRetryKey(baseKey))) ??
    (await findPaymentByIdempotencyKey(baseKey));

  if (payment?.fields.status === "succeeded") {
    await updateJobStatus(jobId, { payment_retry_qstash_id: "" });
    return { jobId, paymentType, skipped: true, reason: "already_succeeded" };
  }

  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return { jobId, paymentType, skipped: true, reason: "driver_not_linked" };
  }

  const driver = await getDriverById(driverId);
  const customerId = driver.fields.stripe_customer_id;
  if (!customerId) {
    return { jobId, paymentType, skipped: true, reason: "stripe_customer_missing" };
  }

  const stripe = getStripe();
  const paymentMethodId = await resolveDefaultPaymentMethod(customerId);

  try {
    if (payment?.fields.stripe_payment_intent_id) {
      const existingIntent = await stripe.paymentIntents.retrieve(
        payment.fields.stripe_payment_intent_id,
      );

      if (existingIntent.status === "succeeded") {
        await updateJobStatus(jobId, { payment_retry_qstash_id: "" });
        return { jobId, paymentType, skipped: true, reason: "already_succeeded" };
      }

      if (RETRYABLE_PI_STATUSES.has(existingIntent.status)) {
        const confirmed = await stripe.paymentIntents.confirm(
          existingIntent.id,
          {
            payment_method: paymentMethodId,
            off_session: true,
          },
        );

        if (payment) {
          await updatePaymentRecord(payment.id, {
            status: confirmed.status === "succeeded" ? "succeeded" : "processing",
            ...(confirmed.status === "succeeded"
              ? { captured_at: new Date().toISOString() }
              : {}),
          });
        }

        await updateJobStatus(jobId, { payment_retry_qstash_id: "" });
        return { jobId, paymentType, action: "retried" };
      }
    }

    const retryKey = paymentRetryKey(baseKey);
    const amountCents = amountCentsForType(paymentType);

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
          paymentType,
        },
      },
      { idempotencyKey: retryKey },
    );

    if (payment) {
      await updatePaymentRecord(payment.id, {
        status:
          paymentIntent.status === "succeeded" ? "succeeded" : "processing",
        idempotency_key: retryKey,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customerId,
        ...(paymentIntent.status === "succeeded"
          ? { captured_at: new Date().toISOString() }
          : {}),
      });
    }

    await updateJobStatus(jobId, { payment_retry_qstash_id: "" });
    return { jobId, paymentType, action: "retried" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Payment retry failed";

    await escalatePaymentRetryFailure(jobId, paymentType, errorMessage);
    await updateJobStatus(jobId, { payment_retry_qstash_id: "" });

    return { jobId, paymentType, action: "escalated" };
  }
}
