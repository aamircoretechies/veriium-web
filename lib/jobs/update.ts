import { getAirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobStatus } from "@/types/airtable/enums";
import type { JobFields } from "@/types/airtable/jobs";
import {
  updateJobSchema,
  type UpdateJobInput,
} from "@/types/airtable/schemas";
import { getJobById } from "./lookup";
import {
  assertPaymentTransition,
  assertTransition,
  isMatchingPhaseStatus,
  isPaymentPhaseStatus,
} from "./transitions";

function applyStatusTimestamps(
  patch: UpdateJobInput,
  currentStatus: JobStatus,
): UpdateJobInput {
  if (!patch.status || patch.status === currentStatus) {
    return patch;
  }

  const now = new Date().toISOString();
  const next = { ...patch };

  if (next.status === "matched" && next.matched_at === undefined) {
    next.matched_at = now;
  }

  if (next.status === "accepted_by_mechanic" && next.accepted_at === undefined) {
    next.accepted_at = now;
  }

  return next;
}

/**
 * Patch a job row with Zod validation, matching-phase transition guards, and
 * automatic lifecycle timestamps (`matched_at`, `accepted_at`).
 */
export async function updateJobStatus(
  jobId: string,
  patch: UpdateJobInput,
): Promise<AirtableRecord<JobFields>> {
  const current = await getJobById(jobId);

  const withTimestamps = applyStatusTimestamps(patch, current.fields.status);
  const fields = updateJobSchema.parse(withTimestamps);

  if (fields.status && fields.status !== current.fields.status) {
    if (isPaymentPhaseStatus(current.fields.status)) {
      assertPaymentTransition(current.fields.status, fields.status);
    } else if (isMatchingPhaseStatus(current.fields.status)) {
      assertTransition(current.fields.status, fields.status);
    }
  }

  const client = getAirtableClient();
  return client.updateRecord<JobFields>("jobs", jobId, fields, {
    typecast: true,
  });
}
