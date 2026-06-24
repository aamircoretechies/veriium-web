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
