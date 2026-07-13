import { getAirtableClient } from "@/lib/airtable";
import { and, eq, findInJoin } from "@/lib/airtable/formula";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { ACTION_ITEM_TYPE, type ActionItemType } from "@/types/airtable/enums";
import type { AirtableLinkedRecords } from "@/types/airtable/fields";
import { createActionItemSchema } from "@/types/airtable/schemas";

/** Return true when an open action item of the given type already exists for the job. */
export async function hasOpenActionItem(
  jobId: string,
  type: ActionItemType,
): Promise<boolean> {
  const client = getAirtableClient();
  const formula = and(
    eq(FIELDS.ActionItems.type, type),
    eq(FIELDS.ActionItems.status, "open"),
    findInJoin(FIELDS.ActionItems.linked_job_id, jobId),
  );

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

export async function createAwaitingAdminMatchActionItem(
  input: CreateAwaitingAdminMatchActionItemInput,
): Promise<string> {
  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.NO_MECHANIC_TIER4,
    status: "open",
    description: `Tier 4 escalation for job ${input.jobId} in ZIP ${input.zipCode}.`,
    linked_job_id: [input.jobId],
    linked_driver_id: input.driver,
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

export async function createPartsFlaggedActionItem(
  input: CreatePartsFlaggedActionItemInput,
): Promise<string> {
  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.PARTS_FLAGGED,
    status: "open",
    description: `Job ${input.jobId}: parts $${input.partsCost.toFixed(2)} exceed $500 threshold (labor $${input.quoteAmount.toFixed(2)}). Approve in Airtable to release quote to driver.`,
    linked_job_id: [input.jobId],
    linked_mechanic_id: input.mechanic,
    linked_driver_id: input.driver,
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

export async function createCancellationReviewActionItem(
  input: CreateCancellationReviewActionItemInput,
): Promise<string> {
  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.FAILED_CANCELLATION_FEE,
    status: "open",
    description: `${input.title}\n${input.notes}`,
    linked_job_id: [input.jobId],
    linked_driver_id: input.driver,
    linked_mechanic_id: input.mechanic,
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
  type?: ActionItemType;
};

export async function createPaymentFailedActionItem(
  input: CreatePaymentFailedActionItemInput,
): Promise<string | null> {
  const type =
    input.type ?? ACTION_ITEM_TYPE.FAILED_DIAGNOSTIC_FEE;

  if (await hasOpenActionItem(input.jobId, type)) {
    return null;
  }

  const actionItemFields = createActionItemSchema.parse({
    type,
    status: "open",
    description: input.title
      ? `${input.title}\n${input.notes}`
      : input.notes,
    linked_job_id: [input.jobId],
    linked_driver_id: input.driver,
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

export async function createDiagnosticFeeRetryFailedActionItem(
  input: CreateDiagnosticFeeRetryFailedActionItemInput,
): Promise<string | null> {
  return createPaymentFailedActionItem({
    jobId: input.jobId,
    title: "Diagnostic fee retry failed",
    notes: input.notes,
    driver: input.driver,
    type: ACTION_ITEM_TYPE.FAILED_DIAGNOSTIC_FEE,
  });
}
