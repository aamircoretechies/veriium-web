import { getAirtableClient } from "@/lib/airtable";
import { eq } from "@/lib/airtable/formula";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { AirtableRecord } from "@/types/airtable/common";
import type { PaymentFields } from "@/types/airtable/payments";
import type { PaymentType } from "@/types/airtable/enums";
import {
  createPaymentSchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from "@/types/airtable/schemas";

/** Find a payment row by job + type (pre-Stripe dedup). */
export async function findPaymentByJobAndType(
  jobId: string,
  type: PaymentType,
): Promise<AirtableRecord<PaymentFields> | null> {
  const client = getAirtableClient();
  // Filter by type in formula; match job_id in code (ARRAYJOIN on linked
  // records returns primary-field names on live Airtable, not record IDs).
  const response = await client.listRecords<PaymentFields>("payments", {
    filterByFormula: eq(FIELDS.Payments.type, type),
    maxRecords: 100,
  });

  return (
    response.records.find((row) => row.fields.job_id?.includes(jobId)) ?? null
  );
}

/** Find a payment row by Stripe SetupIntent id. */
export async function findPaymentBySetupIntentId(
  setupIntentId: string,
): Promise<AirtableRecord<PaymentFields> | null> {
  const client = getAirtableClient();
  const formula = eq(FIELDS.Payments.stripe_setup_intent_id, setupIntentId);

  const response = await client.listRecords<PaymentFields>("payments", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Find a payment row by Stripe PaymentIntent id. */
export async function findPaymentByPaymentIntentId(
  paymentIntentId: string,
): Promise<AirtableRecord<PaymentFields> | null> {
  const client = getAirtableClient();
  const formula = eq(FIELDS.Payments.stripe_payment_intent_id, paymentIntentId);

  const response = await client.listRecords<PaymentFields>("payments", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Find a payment row by Stripe webhook event id. */
export async function findPaymentByWebhookEventId(
  webhookEventId: string,
): Promise<AirtableRecord<PaymentFields> | null> {
  const client = getAirtableClient();
  const formula = eq(FIELDS.Payments.webhook_event_id, webhookEventId);

  const response = await client.listRecords<PaymentFields>("payments", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Insert a Payments row after job+type idempotency check. */
export async function createPaymentRecord(
  input: CreatePaymentInput,
): Promise<AirtableRecord<PaymentFields>> {
  const jobId = input.job_id?.[0];
  if (jobId) {
    const existing = await findPaymentByJobAndType(jobId, input.type);
    if (existing) {
      return existing;
    }
  }

  const fields = createPaymentSchema.parse(input);
  const client = getAirtableClient();
  return client.createRecord<PaymentFields>("payments", fields, {
    typecast: true,
  });
}

/** Patch an existing Payments row. */
export async function updatePaymentRecord(
  paymentId: string,
  patch: UpdatePaymentInput,
): Promise<AirtableRecord<PaymentFields>> {
  const fields = updatePaymentSchema.parse(patch);
  const client = getAirtableClient();
  return client.updateRecord<PaymentFields>("payments", paymentId, fields, {
    typecast: true,
  });
}
