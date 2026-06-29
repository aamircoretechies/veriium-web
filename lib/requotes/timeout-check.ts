import { getJobById } from "@/lib/jobs/lookup";
import { declineRequote } from "@/lib/service/requote-response";
import type { JobStatus } from "@/types/airtable/enums";

export type RequoteTimeoutCheckResult = {
  jobId: string;
  skipped?: boolean;
  reason?: string;
  action?: "cancelled";
};

/**
 * QStash worker — 2h after driver requote SMS, auto-decline if still `requote_submitted` (§5.5).
 */
export async function runRequoteTimeoutCheck(
  jobId: string,
): Promise<RequoteTimeoutCheckResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "requote_submitted") {
    return {
      jobId,
      skipped: true,
      reason: `status_${job.fields.status as JobStatus}`,
    };
  }

  await declineRequote(jobId);

  return { jobId, action: "cancelled" };
}
