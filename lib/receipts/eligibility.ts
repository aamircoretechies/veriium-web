import type { JobFields } from "@/types/airtable/jobs";
import type { JobStatus } from "@/types/airtable/enums";

const RECEIPT_ELIGIBLE_STATUSES = [
  "quote_submitted",
  "quote_approved",
  "in_progress",
  "completed_pending_confirmation",
] as const satisfies readonly JobStatus[];

const receiptEligibleSet = new Set<JobStatus>(RECEIPT_ELIGIBLE_STATUSES);

const TERMINAL_STATUSES = [
  "cancelled",
  "quote_declined",
  "confirmed",
  "refunded",
] as const satisfies readonly JobStatus[];

const terminalStatusSet = new Set<JobStatus>(TERMINAL_STATUSES);

/** Whether this job requires a parts receipt (QUOTE had parts or ON_HAND). */
export function jobRequiresReceipt(job: Pick<JobFields, "parts_cost" | "on_hand">): boolean {
  return (job.parts_cost ?? 0) > 0 || job.on_hand === true;
}

/** Job statuses where a mechanic may submit a receipt. */
export function isReceiptEligibleStatus(status: JobStatus): boolean {
  return receiptEligibleSet.has(status);
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return terminalStatusSet.has(status);
}
