import type { JobFields } from "@/types/airtable/jobs";
import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { isQuoteApproved, JOB_STATUS } from "@/lib/jobs/status";

/** Actual parts amount to charge on post-approve cancellation (Exhibit A §5.6). */
export function resolvePartsCancelAmount(
  job: Pick<JobFields, "parts_cost" | "quote_details">,
): number {
  const details = parseQuoteDetails(job.quote_details);
  return details.receipt_total ?? job.parts_cost ?? 0;
}

export function shouldChargePartsOnCancel(
  job: Pick<JobFields, "status" | "parts_cost" | "quote_details">,
): boolean {
  const details = parseQuoteDetails(job.quote_details);
  const approvedOrInProgress =
    isQuoteApproved(job.status ?? JOB_STATUS.draft) ||
    job.status === JOB_STATUS.in_progress;

  if (!approvedOrInProgress) {
    return false;
  }

  if (details.receipt_status !== "submitted") {
    return false;
  }

  if (details.parts_reimbursement_forfeited === true) {
    return false;
  }

  return resolvePartsCancelAmount(job) > 0;
}
