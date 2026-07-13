import { getAirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import {
  updateJobSchema,
  type UpdateJobInput,
} from "@/types/airtable/schemas";
import { getJobById } from "./lookup";
import {
  assertPaymentTransition,
  assertServiceTransition,
  assertTransition,
  isMatchingPhaseStatus,
  isPaymentPhaseStatus,
  isServicePhaseStatus,
} from "./transitions";

/**
 * Patch a job row with Zod validation and lifecycle transition guards.
 */
export async function updateJobStatus(
  jobId: string,
  patch: UpdateJobInput,
): Promise<AirtableRecord<JobFields>> {
  const current = await getJobById(jobId);
  const fields = updateJobSchema.parse(patch);

  if (fields.status && fields.status !== current.fields.status) {
    if (isPaymentPhaseStatus(current.fields.status!)) {
      assertPaymentTransition(current.fields.status!, fields.status);
    } else if (isServicePhaseStatus(current.fields.status!)) {
      assertServiceTransition(current.fields.status!, fields.status);
    } else if (isMatchingPhaseStatus(current.fields.status!)) {
      assertTransition(current.fields.status!, fields.status);
    }
  }

  const client = getAirtableClient();
  return client.updateRecord<JobFields>(
    "jobs",
    jobId,
    fields as Partial<JobFields>,
    { typecast: true },
  );
}
