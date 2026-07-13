import { getJobById } from "@/lib/jobs/lookup";
import { getMatchTier, JOB_STATUS } from "@/lib/jobs/status";
import { runTier2 } from "./tier2";
import { runTier3 } from "./tier3";
import { runTier4 } from "./tier4";

export type MatchEscalationTier = 2 | 3 | 4;

export type MatchEscalatePayload = {
  jobId: string;
  tier: MatchEscalationTier;
};

const TERMINAL_STATUSES = new Set<string>([
  JOB_STATUS.accepted_by_mechanic,
  JOB_STATUS.awaiting_admin_match,
]);

export async function escalateToTier(
  jobId: string,
  tier: MatchEscalationTier,
): Promise<void> {
  const job = await getJobById(jobId);

  if (TERMINAL_STATUSES.has(job.fields.status ?? "")) {
    return;
  }

  const matchTier = getMatchTier(job);

  switch (tier) {
    case 2:
      if (
        job.fields.status !== JOB_STATUS.matched_awaiting_response ||
        matchTier !== 1
      ) {
        return;
      }
      await runTier2(jobId);
      break;
    case 3:
      if (
        job.fields.status !== JOB_STATUS.matched_awaiting_response ||
        matchTier !== 2
      ) {
        return;
      }
      await runTier3(jobId);
      break;
    case 4:
      if (
        job.fields.status !== JOB_STATUS.matched_awaiting_response ||
        matchTier !== 3
      ) {
        return;
      }
      await runTier4(jobId);
      break;
  }
}
