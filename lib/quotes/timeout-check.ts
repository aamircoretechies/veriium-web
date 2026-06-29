import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { declineQuote } from "@/lib/service/quote-response";
import type { JobStatus } from "@/types/airtable/enums";

export type QuoteTimeoutCheckResult = {
  jobId: string;
  skipped?: boolean;
  reason?: string;
  action?: "cancelled";
};

/**
 * QStash worker — 2h after driver quote SMS, auto-decline if still `quote_submitted` (§3.4).
 * Idempotent; skips if driver already responded.
 */
export async function runQuoteTimeoutCheck(
  jobId: string,
): Promise<QuoteTimeoutCheckResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "quote_submitted") {
    return {
      jobId,
      skipped: true,
      reason: `status_${job.fields.status as JobStatus}`,
    };
  }

  await declineQuote(jobId);

  return { jobId, action: "cancelled" };
}
