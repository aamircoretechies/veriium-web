import type { JobFields } from "@/types/airtable/jobs";
import type { JobStatus } from "@/types/airtable/enums";
import { JOB_STATUS } from "@/lib/jobs/status";

const RECEIPT_ELIGIBLE_STATUSES = [
  JOB_STATUS.quote_provided,
  JOB_STATUS.awaiting_customer_approval,
  JOB_STATUS.approved_parts_pickup,
  JOB_STATUS.in_progress,
  JOB_STATUS.completed_pending_confirmation,
] as const satisfies readonly JobStatus[];

const receiptEligibleSet = new Set<JobStatus>(RECEIPT_ELIGIBLE_STATUSES);

const TERMINAL_STATUSES = [
  JOB_STATUS.cancelled,
  JOB_STATUS.cancelled_after_diagnosis,
  JOB_STATUS.confirmed,
  JOB_STATUS.refunded,
] as const satisfies readonly JobStatus[];

const terminalStatusSet = new Set<JobStatus>(TERMINAL_STATUSES);

export function jobRequiresReceipt(
  job: Pick<JobFields, "parts_cost" | "quote_parts_on_hand">,
): boolean {
  return (job.parts_cost ?? 0) > 0 || job.quote_parts_on_hand === true;
}

export function isReceiptEligibleStatus(status: JobStatus): boolean {
  return receiptEligibleSet.has(status);
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return terminalStatusSet.has(status);
}
