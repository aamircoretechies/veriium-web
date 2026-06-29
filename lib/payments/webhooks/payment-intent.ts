import type Stripe from "stripe";

import { getAirtableClient } from "@/lib/airtable";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  createPaymentRecord,
  findPaymentByIdempotencyKey,
  findPaymentByPaymentIntentId,
  updatePaymentRecord,
} from "@/lib/payments/record";
import {
  CANCELLATION_MECHANIC_PAYOUT,
  CANCELLATION_PLATFORM_FEE,
  DIAGNOSTIC_MECHANIC_PAYOUT,
  DIAGNOSTIC_PLATFORM_FEE,
} from "@/lib/stripe/constants";
import {
  cancelKey,
  diagnosticKey,
  finalKey,
  installedPartsKey,
  partsCancelKey,
  tipKey,
} from "@/lib/stripe/idempotency";
import type { ActionItemFields } from "@/types/airtable/action-items";
import type { AirtableRecord } from "@/types/airtable/common";
import type { PaymentStatus, PaymentType } from "@/types/airtable/enums";
import type { PaymentFields } from "@/types/airtable/payments";
import { createActionItemSchema } from "@/types/airtable/schemas";

const PAYMENT_TYPE_VALUES = new Set<string>([
  "final",
  "cancellation_fee",
  "diagnostic_fee",
  "installed_parts",
  "parts_cancellation",
  "tip",
]);

export async function handlePaymentIntentEvent(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const status = statusFromWebhookEvent(event.type, paymentIntent.status);

  const payment = await upsertPaymentFromIntent(paymentIntent, status);

  if (event.type === "payment_intent.succeeded") {
    const paymentType = paymentIntent.metadata?.paymentType;
    const jobId = paymentIntent.metadata?.jobId;
    if (jobId && paymentType) {
      await applyPayoutForPaymentType(jobId, paymentType);
    }
    return;
  }

  if (event.type === "payment_intent.payment_failed") {
    await createPaymentFailedActionItem(paymentIntent, payment);
  }
}

function statusFromWebhookEvent(
  eventType: Stripe.Event.Type,
  intentStatus: Stripe.PaymentIntent.Status,
): PaymentStatus {
  switch (eventType) {
    case "payment_intent.succeeded":
      return "succeeded";
    case "payment_intent.canceled":
      return "canceled";
    case "payment_intent.payment_failed":
      return "failed";
    default:
      return mapIntentStatus(intentStatus);
  }
}

function mapIntentStatus(
  status: Stripe.PaymentIntent.Status,
): PaymentStatus {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "processing":
      return "processing";
    case "canceled":
      return "canceled";
    case "requires_action":
      return "requires_action";
    case "requires_confirmation":
    case "requires_payment_method":
    case "requires_capture":
      return "pending";
    default:
      return "failed";
  }
}

function idempotencyKeyForType(jobId: string, paymentType: string): string | null {
  switch (paymentType) {
    case "final":
      return finalKey(jobId);
    case "diagnostic_fee":
      return diagnosticKey(jobId);
    case "cancellation_fee":
      return cancelKey(jobId);
    case "installed_parts":
      return installedPartsKey(jobId);
    case "parts_cancellation":
      return partsCancelKey(jobId);
    case "tip":
      return tipKey(jobId);
    default:
      return null;
  }
}

function getChargeId(paymentIntent: Stripe.PaymentIntent): string | undefined {
  const latestCharge = paymentIntent.latest_charge;
  if (typeof latestCharge === "string") {
    return latestCharge;
  }
  return latestCharge?.id;
}

async function upsertPaymentFromIntent(
  paymentIntent: Stripe.PaymentIntent,
  status: PaymentStatus,
): Promise<AirtableRecord<PaymentFields>> {
  const jobId = paymentIntent.metadata?.jobId;
  const paymentType = paymentIntent.metadata?.paymentType;

  if (!jobId || !paymentType || !PAYMENT_TYPE_VALUES.has(paymentType)) {
    throw new Error("PaymentIntent is missing jobId or paymentType metadata");
  }

  let payment = await findPaymentByPaymentIntentId(paymentIntent.id);
  if (!payment) {
    const idempotencyKey = idempotencyKeyForType(jobId, paymentType);
    if (idempotencyKey) {
      payment = await findPaymentByIdempotencyKey(idempotencyKey);
    }
  }

  const amountDollars = paymentIntent.amount / 100;
  const chargeId = getChargeId(paymentIntent);
  const customerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer?.id;

  const patch = {
    status,
    amount: amountDollars,
    stripe_payment_intent_id: paymentIntent.id,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    ...(chargeId ? { stripe_charge_id: chargeId } : {}),
    ...(status === "succeeded"
      ? { captured_at: new Date().toISOString() }
      : {}),
  };

  if (payment) {
    if (
      payment.fields.status === status &&
      (!chargeId || payment.fields.stripe_charge_id === chargeId)
    ) {
      return payment;
    }
    return updatePaymentRecord(payment.id, patch);
  }

  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  const idempotencyKey = idempotencyKeyForType(jobId, paymentType);
  if (!idempotencyKey) {
    throw new Error(`Unknown payment type: ${paymentType}`);
  }

  return createPaymentRecord({
    type: paymentType as PaymentType,
    amount: amountDollars,
    status,
    idempotency_key: idempotencyKey,
    stripe_customer_id: customerId,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id: chargeId,
    job: [jobId],
    driver: driverId ? [driverId] : undefined,
    ...(status === "succeeded"
      ? { captured_at: new Date().toISOString() }
      : {}),
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

async function createPaymentFailedActionItem(
  paymentIntent: Stripe.PaymentIntent,
  payment: AirtableRecord<PaymentFields>,
): Promise<void> {
  const jobId = paymentIntent.metadata?.jobId ?? payment.fields.job?.[0];
  const driverId = payment.fields.driver?.[0];
  const paymentType = paymentIntent.metadata?.paymentType ?? payment.fields.type;
  const errorMessage =
    paymentIntent.last_payment_error?.message ?? "Payment failed";

  const actionItemFields = createActionItemSchema.parse({
    type: "payment_failed",
    status: "open",
    title: "Payment failed",
    notes: `PaymentIntent ${paymentIntent.id} (${paymentType}): ${errorMessage}`,
    ...(jobId ? { job: [jobId] } : {}),
    ...(driverId ? { driver: [driverId] } : {}),
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });
}
