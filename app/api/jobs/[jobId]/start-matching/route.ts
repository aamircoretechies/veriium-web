import { getEnv } from "@/config/env";
import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getJobById } from "@/lib/jobs/lookup";
import { InvalidJobTransitionError } from "@/lib/jobs/transitions";
import { updateJobStatus } from "@/lib/jobs/update";
import { beginMatching, JobNotMatchableError } from "@/lib/matching";
import type { JobStatus } from "@/types/airtable/enums";

const MATCHING_DEV_SECRET_HEADER = "x-matching-dev-secret";

const MATCHABLE_FROM_STATUSES: readonly JobStatus[] = [
  "draft",
  "matched_awaiting_payment",
  "matched",
];

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const env = getEnv();
  const secret = request.headers.get(MATCHING_DEV_SECRET_HEADER);

  if (!secret || secret !== env.MATCHING_DEV_SECRET) {
    return jsonError(401, "unauthorized", "Invalid matching dev secret.");
  }

  const { jobId } = await context.params;

  try {
    const job = await getJobById(jobId);
    const status = job.fields.status;

    if (!MATCHABLE_FROM_STATUSES.includes(status)) {
      return jsonError(
        409,
        "job_not_matchable",
        `Job cannot start matching from status ${status}.`,
      );
    }

    if (status === "draft" || status === "matched_awaiting_payment") {
      await updateJobStatus(jobId, { status: "matched" });
    }

    const result = await beginMatching(jobId);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", `Job ${jobId} not found.`);
    }

    if (error instanceof JobNotMatchableError) {
      return jsonError(409, "job_not_matchable", error.message);
    }

    if (error instanceof InvalidJobTransitionError) {
      return jsonError(409, "invalid_transition", error.message);
    }

    console.error(`[api/jobs/${jobId}/start-matching]`, error);
    throw error;
  }
}
