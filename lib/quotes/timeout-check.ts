import { getJobById } from "@/lib/jobs/lookup";
import { isQuoteSubmitted } from "@/lib/jobs/status";
import { declineQuote } from "@/lib/service/quote-response";

export type QuoteTimeoutCheckResult = {
  jobId: string;
  skipped?: boolean;
  reason?: string;
  action?: "cancelled";
};

export async function runQuoteTimeoutCheck(
  jobId: string,
): Promise<QuoteTimeoutCheckResult> {
  const job = await getJobById(jobId);

  if (!isQuoteSubmitted(job)) {
    return {
      jobId,
      skipped: true,
      reason: `status_${job.fields.status ?? "unknown"}`,
    };
  }

  await declineQuote(jobId);

  return { jobId, action: "cancelled" };
}
