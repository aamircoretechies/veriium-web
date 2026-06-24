import { getJobById } from "@/lib/jobs/lookup";
import { runTier2 } from "./tier2";
import { runTier3 } from "./tier3";
import { runTier4 } from "./tier4";

export type MatchEscalationTier = 2 | 3 | 4;

export type MatchEscalatePayload = {
  jobId: string;
  tier: MatchEscalationTier;
};

const TERMINAL_STATUSES = new Set([
  "accepted_by_mechanic",
  "awaiting_admin_match",
]);

/**
 * QStash worker entry — escalate a job to the requested tier when guards pass.
 * No-ops when the job has already advanced past the matching step.
 */
export async function escalateToTier(
  jobId: string,
  tier: MatchEscalationTier,
): Promise<void> {
  const job = await getJobById(jobId);

  if (TERMINAL_STATUSES.has(job.fields.status)) {
    return;
  }

  switch (tier) {
    case 2:
      if (job.fields.status !== "matched") {
        return;
      }
      await runTier2(jobId);
      break;
    case 3:
      if (job.fields.status !== "matched_tier2") {
        return;
      }
      await runTier3(jobId);
      break;
    case 4:
      if (job.fields.status !== "matched_tier3") {
        return;
      }
      await runTier4(jobId);
      break;
  }
}
