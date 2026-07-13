import { getAirtableClient } from "@/lib/airtable";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails, parseQuoteDetails } from "@/lib/jobs/quote-details";
import { updateJobStatus } from "@/lib/jobs/update";
import { ACTION_ITEM_TYPE } from "@/types/airtable/enums";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { createActionItemSchema } from "@/types/airtable/schemas";
import { isTerminalJobStatus } from "./eligibility";

export type ReceiptCheckResult = {
  jobId: string;
  skipped?: boolean;
  reason?: string;
  action?: "receipt_overdue_flagged";
};

export async function runReceiptDeadlineCheck(
  jobId: string,
): Promise<ReceiptCheckResult> {
  const job = await getJobById(jobId);

  if (isTerminalJobStatus(job.fields.status ?? "cancelled")) {
    return { jobId, skipped: true, reason: "job_terminal" };
  }

  const details = parseQuoteDetails(job.fields.quote_details);

  if (details.receipt_status === "submitted") {
    return { jobId, skipped: true, reason: "receipt_already_submitted" };
  }

  if (details.parts_reimbursement_forfeited === true) {
    return { jobId, skipped: true, reason: "already_forfeited" };
  }

  if (details.receipt_status === "overdue") {
    return { jobId, skipped: true, reason: "already_overdue" };
  }

  await updateJobStatus(jobId, {
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      receipt_status: "overdue",
      parts_reimbursement_forfeited: true,
    }),
  });

  const partsCost = job.fields.parts_cost ?? 0;
  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.RECEIPT_NOT_SUBMITTED,
    status: "open",
    description: `Job ${jobId}: no valid parts receipt within 24 hours of QUOTE. Parts cost $${partsCost.toFixed(2)}. Parts reimbursement forfeited per §5.3.`,
    linked_job_id: [jobId],
    linked_mechanic_id: job.fields.mechanic_id,
    linked_driver_id: job.fields.driver_id,
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });

  return { jobId, action: "receipt_overdue_flagged" };
}
