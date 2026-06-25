import { getAirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { PaymentFields } from "@/types/airtable/payments";
import {
  createPaymentSchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from "@/types/airtable/schemas";

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Find a payment row by §10.2 idempotency key (webhook retry safety). */
export async function findPaymentByIdempotencyKey(
  idempotencyKey: string,
): Promise<AirtableRecord<PaymentFields> | null> {
  const client = getAirtableClient();
  const formula = `{idempotency_key} = '${escapeAirtableString(idempotencyKey)}'`;

  const response = await client.listRecords<PaymentFields>("payments", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Find a payment row by Stripe SetupIntent id. */
export async function findPaymentBySetupIntentId(
  setupIntentId: string,
): Promise<AirtableRecord<PaymentFields> | null> {
  const client = getAirtableClient();
  const formula = `{stripe_setup_intent_id} = '${escapeAirtableString(setupIntentId)}'`;

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
  const formula = `{stripe_payment_intent_id} = '${escapeAirtableString(paymentIntentId)}'`;

  const response = await client.listRecords<PaymentFields>("payments", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Find a payment row by Stripe Charge id. */
export async function findPaymentByChargeId(
  chargeId: string,
): Promise<AirtableRecord<PaymentFields> | null> {
  const client = getAirtableClient();
  const formula = `{stripe_charge_id} = '${escapeAirtableString(chargeId)}'`;

  const response = await client.listRecords<PaymentFields>("payments", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Insert a Payments row after idempotency check. */
export async function createPaymentRecord(
  input: CreatePaymentInput,
): Promise<AirtableRecord<PaymentFields>> {
  const existing = await findPaymentByIdempotencyKey(input.idempotency_key);
  if (existing) {
    return existing;
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
