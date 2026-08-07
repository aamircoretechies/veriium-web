import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { scheduleJob } from "@/lib/qstash/schedule";
import {
  getTierDelaysSeconds,
  MATCH_ESCALATE_PATH,
} from "./constants";
import { JobNotMatchableError } from "./errors";
import { runTier1 } from "./tier1";
import { runTier2 } from "./tier2";

export type BeginMatchingResult = {
  jobId: string;
  tier1MechanicId: string | null;
  scheduledEscalations: boolean;
};

async function scheduleEscalations(
  jobId: string,
  matchedAtIso: string,
): Promise<void> {
  const delays = getTierDelaysSeconds();
  const baseUnix = Math.floor(new Date(matchedAtIso).getTime() / 1000);

  await Promise.all([
    scheduleJob({
      path: MATCH_ESCALATE_PATH,
      body: { jobId, tier: 2 },
      notBefore: baseUnix + delays.tier2,
    }),
    scheduleJob({
      path: MATCH_ESCALATE_PATH,
      body: { jobId, tier: 3 },
      notBefore: baseUnix + delays.tier3,
    }),
    scheduleJob({
      path: MATCH_ESCALATE_PATH,
      body: { jobId, tier: 4 },
      notBefore: baseUnix + delays.tier4,
    }),
  ]);
}

export async function beginMatching(jobId: string): Promise<BeginMatchingResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== JOB_STATUS.matched_awaiting_response) {
    throw new JobNotMatchableError(jobId, jobStatusOr(job.fields.status));
  }

  if (!job.fields.zip_code) {
    throw new JobNotMatchableError(
      jobId,
      jobStatusOr(job.fields.status),
      "Missing zip_code",
    );
  }

  let matchedAt = job.fields.match_tier_started_at;
  if (!matchedAt) {
    matchedAt = new Date().toISOString();
    await updateJobStatus(jobId, {
      match_tier: 1,
      match_tier_started_at: matchedAt,
    });
  }

  const tier1 = await runTier1(jobId);
  if (!tier1) {
    await runTier2(jobId);
  }

  await scheduleEscalations(jobId, matchedAt);

  return {
    jobId,
    tier1MechanicId: tier1?.mechanicId ?? null,
    scheduledEscalations: true,
  };
}
