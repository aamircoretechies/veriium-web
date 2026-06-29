import { getAirtableClient } from "@/lib/airtable";
import type { ActionItemFields } from "@/types/airtable/action-items";
import type { AirtableLinkedRecords } from "@/types/airtable/fields";
import { createActionItemSchema } from "@/types/airtable/schemas";

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
