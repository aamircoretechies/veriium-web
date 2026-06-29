import type { JobFields } from "@/types/airtable/jobs";

/** Actual parts amount to charge on post-approve cancellation (Exhibit A §5.6). */
export function resolvePartsCancelAmount(
  job: Pick<JobFields, "receipt_total" | "parts_cost">,
): number {
  return job.receipt_total ?? job.parts_cost ?? 0;
}

/** Whether a separate parts PI should be created on driver cancel (Exhibit A §5.6). */
export function shouldChargePartsOnCancel(
  job: Pick<
    JobFields,
    | "status"
    | "quote_approved_at"
    | "receipt_status"
    | "receipt_url"
    | "parts_reimbursement_forfeited"
    | "receipt_total"
    | "parts_cost"
  >,
): boolean {
  const approvedOrInProgress =
    Boolean(job.quote_approved_at) || job.status === "in_progress";

  if (!approvedOrInProgress) {
    return false;
  }

  if (job.receipt_status !== "submitted" || !job.receipt_url) {
    return false;
  }

  if (job.parts_reimbursement_forfeited === true) {
    return false;
  }

  return resolvePartsCancelAmount(job) > 0;
}
