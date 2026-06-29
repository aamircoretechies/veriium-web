import { getAirtableClient } from "@/lib/airtable";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { createActionItemSchema } from "@/types/airtable/schemas";
import { isTerminalJobStatus } from "./eligibility";

export type ReceiptCheckResult = {
  jobId: string;
  skipped?: boolean;
  reason?: string;
  action?: "receipt_overdue_flagged";
};

/**
 * QStash worker — 24h after QUOTE, forfeit parts reimbursement if receipt missing (§5.3).
 * Idempotent; does not block labor payout.
 */
export async function runReceiptDeadlineCheck(
  jobId: string,
): Promise<ReceiptCheckResult> {
  const job = await getJobById(jobId);

  if (isTerminalJobStatus(job.fields.status)) {
    return { jobId, skipped: true, reason: "job_terminal" };
  }

  if (job.fields.receipt_status === "submitted") {
    return { jobId, skipped: true, reason: "receipt_already_submitted" };
  }

  if (job.fields.parts_reimbursement_forfeited === true) {
    return { jobId, skipped: true, reason: "already_forfeited" };
  }

  if (job.fields.receipt_status === "overdue") {
    return { jobId, skipped: true, reason: "already_overdue" };
  }

  await updateJobStatus(jobId, {
    receipt_status: "overdue",
    parts_reimbursement_forfeited: true,
  });

  const partsCost = job.fields.parts_cost ?? 0;
  const actionItemFields = createActionItemSchema.parse({
    type: "receipt_overdue",
    status: "open",
    title: "Parts receipt overdue",
    notes: `Job ${jobId}: no valid parts receipt within 24 hours of QUOTE. Parts cost $${partsCost.toFixed(2)}. Parts reimbursement forfeited per §5.3.`,
    job: [jobId],
    mechanic: job.fields.mechanic,
    driver: job.fields.driver,
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });

  return { jobId, action: "receipt_overdue_flagged" };
}
