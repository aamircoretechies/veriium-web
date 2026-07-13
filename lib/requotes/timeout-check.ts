import { getJobById } from "@/lib/jobs/lookup";
import { isRequoteSubmitted } from "@/lib/jobs/status";
import { declineRequote } from "@/lib/service/requote-response";

export type RequoteTimeoutCheckResult = {
  jobId: string;
  skipped?: boolean;
  reason?: string;
  action?: "cancelled";
};

export async function runRequoteTimeoutCheck(
  jobId: string,
): Promise<RequoteTimeoutCheckResult> {
  const job = await getJobById(jobId);

  if (!isRequoteSubmitted(job)) {
    return {
      jobId,
      skipped: true,
      reason: `status_${job.fields.status ?? "unknown"}`,
    };
  }

  await declineRequote(jobId);

  return { jobId, action: "cancelled" };
}
