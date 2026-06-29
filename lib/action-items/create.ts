import { getAirtableClient } from "@/lib/airtable";
import type { ActionItemFields } from "@/types/airtable/action-items";
import type { ActionItemType } from "@/types/airtable/enums";
import type { AirtableLinkedRecords } from "@/types/airtable/fields";
import { createActionItemSchema } from "@/types/airtable/schemas";

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Return true when an open action item of the given type already exists for the job. */
export async function hasOpenActionItem(
  jobId: string,
  type: ActionItemType,
): Promise<boolean> {
  const client = getAirtableClient();
  const formula = `AND({type} = '${escapeAirtableString(type)}', {status} = 'open', FIND('${escapeAirtableString(jobId)}', ARRAYJOIN({job}, ',')))`;

  const response = await client.listRecords<ActionItemFields>("action-items", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records.length > 0;
}

export type CreateAwaitingAdminMatchActionItemInput = {
  jobId: string;
  zipCode: string;
  driver?: AirtableLinkedRecords;
};

/** Create an admin alert action item when a job needs manual mechanic matching. */
export async function createAwaitingAdminMatchActionItem(
  input: CreateAwaitingAdminMatchActionItemInput,
): Promise<string> {
  const actionItemFields = createActionItemSchema.parse({
    type: "awaiting_admin_match",
    status: "open",
    title: "Job awaiting manual mechanic match",
    notes: `Tier 4 escalation for job ${input.jobId} in ZIP ${input.zipCode}.`,
    job: [input.jobId],
    driver: input.driver,
  });

  const client = getAirtableClient();
  const record = await client.createRecord<ActionItemFields>(
    "action-items",
    actionItemFields,
    { typecast: true },
  );

  return record.id;
}

export type CreatePartsFlaggedActionItemInput = {
  jobId: string;
  quoteAmount: number;
  partsCost: number;
  mechanic?: AirtableLinkedRecords;
  driver?: AirtableLinkedRecords;
};

/** Create an admin alert when parts cost exceeds the pre-approval threshold (Exhibit A §6). */
export async function createPartsFlaggedActionItem(
  input: CreatePartsFlaggedActionItemInput,
): Promise<string> {
  const actionItemFields = createActionItemSchema.parse({
    type: "parts_flagged",
    status: "open",
    title: "Parts quote flagged for admin review",
    notes: `Job ${input.jobId}: parts $${input.partsCost.toFixed(2)} exceed $500 threshold (labor $${input.quoteAmount.toFixed(2)}). Approve in Airtable to release quote to driver.`,
    job: [input.jobId],
    mechanic: input.mechanic,
    driver: input.driver,
  });

  const client = getAirtableClient();
  const record = await client.createRecord<ActionItemFields>(
    "action-items",
    actionItemFields,
    { typecast: true },
  );

  return record.id;
}

export type CreateCancellationReviewActionItemInput = {
  jobId: string;
  title: string;
  notes: string;
  driver?: AirtableLinkedRecords;
  mechanic?: AirtableLinkedRecords;
};

/** Admin review when cancellation-related charges fail (§9.1, Exhibit A §4). */
export async function createCancellationReviewActionItem(
  input: CreateCancellationReviewActionItemInput,
): Promise<string> {
  const actionItemFields = createActionItemSchema.parse({
    type: "cancellation_review",
    status: "open",
    title: input.title,
    notes: input.notes,
    job: [input.jobId],
    driver: input.driver,
    mechanic: input.mechanic,
  });

  const client = getAirtableClient();
  const record = await client.createRecord<ActionItemFields>(
    "action-items",
    actionItemFields,
    { typecast: true },
  );

  return record.id;
}

export type CreatePaymentFailedActionItemInput = {
  jobId: string;
  title?: string;
  notes: string;
  driver?: AirtableLinkedRecords;
};

/** Create a payment_failed action item when no open item exists for the job. */
export async function createPaymentFailedActionItem(
  input: CreatePaymentFailedActionItemInput,
): Promise<string | null> {
  if (await hasOpenActionItem(input.jobId, "payment_failed")) {
    return null;
  }

  const actionItemFields = createActionItemSchema.parse({
    type: "payment_failed",
    status: "open",
    title: input.title ?? "Payment failed",
    notes: input.notes,
    job: [input.jobId],
    driver: input.driver,
  });

  const client = getAirtableClient();
  const record = await client.createRecord<ActionItemFields>(
    "action-items",
    actionItemFields,
    { typecast: true },
  );

  return record.id;
}

export type CreateDiagnosticFeeRetryFailedActionItemInput = {
  jobId: string;
  notes: string;
  driver?: AirtableLinkedRecords;
};

/** Escalation when the 24h diagnostic fee retry fails (Exhibit A §4). */
export async function createDiagnosticFeeRetryFailedActionItem(
  input: CreateDiagnosticFeeRetryFailedActionItemInput,
): Promise<string | null> {
  return createPaymentFailedActionItem({
    jobId: input.jobId,
    title: "Diagnostic fee retry failed",
    notes: input.notes,
    driver: input.driver,
  });
}
