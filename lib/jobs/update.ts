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
  assertServiceTransition,
  assertTransition,
  isMatchingPhaseStatus,
  isPaymentPhaseStatus,
  isServicePhaseStatus,
} from "./transitions";

const STATUS_TIMESTAMP_FIELDS = {
  matched: "matched_at",
  accepted_by_mechanic: "accepted_at",
  en_route: "en_route_at",
  arrived: "arrived_at",
  vehicle_received: "vehicle_received_at",
  diagnosing: "diagnosing_at",
  quote_pending_admin: "quote_pending_admin_at",
  quote_submitted: "quote_submitted_at",
  quote_approved: "quote_approved_at",
  quote_declined: "quote_declined_at",
  requote_submitted: "requote_submitted_at",
  in_progress: "in_progress_at",
  completed_pending_confirmation: "completed_at",
  confirmed: "confirmed_at",
  disputed: "disputed_at",
  cancelled: "cancelled_at",
} as const satisfies Partial<
  Record<JobStatus, keyof UpdateJobInput>
>;

function applyStatusTimestamps(
  patch: UpdateJobInput,
  currentStatus: JobStatus,
): UpdateJobInput {
  if (!patch.status || patch.status === currentStatus) {
    return patch;
  }

  const now = new Date().toISOString();
  const next = { ...patch };
  const timestampField = STATUS_TIMESTAMP_FIELDS[next.status];

  if (timestampField && next[timestampField] === undefined) {
    next[timestampField] = now;
  }

  return next;
}

/**
 * Patch a job row with Zod validation, lifecycle transition guards, and
 * automatic lifecycle timestamps.
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
    } else if (isServicePhaseStatus(current.fields.status)) {
      assertServiceTransition(current.fields.status, fields.status);
    } else if (isMatchingPhaseStatus(current.fields.status)) {
      assertTransition(current.fields.status, fields.status);
    }
  }

  const client = getAirtableClient();
  return client.updateRecord<JobFields>("jobs", jobId, fields, {
    typecast: true,
  });
}
