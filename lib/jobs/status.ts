import type { JobsRecord } from "@/types/airtable/generated/records";
import type { JobsStatus } from "@/types/airtable/generated/enums";
import type { AirtableRecord } from "@/types/airtable/common";
import { parseQuoteDetails } from "./quote-details";

type JobLike = Pick<JobsRecord, "match_tier"> | AirtableRecord<JobsRecord>;
type JobFieldsLike =
  | Pick<JobsRecord, "status" | "parts_cost_flagged" | "quote_details">
  | AirtableRecord<JobsRecord>;

function resolveFields<T extends Record<string, unknown>>(
  value: T | AirtableRecord<T>,
): T {
  if ("fields" in value) {
    return value.fields as T;
  }
  return value;
}

export function jobStatusOr(
  status: JobsStatus | undefined,
  fallback: JobsStatus = "draft",
): JobsStatus {
  return status ?? fallback;
}

/** Schema-aligned job status literals. */
export const JOB_STATUS = {
  draft: "draft",
  matched_awaiting_payment: "matched_awaiting_payment",
  matched_awaiting_response: "matched_awaiting_response",
  awaiting_admin_match: "awaiting_admin_match",
  accepted_by_mechanic: "accepted_by_mechanic",
  en_route: "en_route",
  arrived: "arrived",
  vehicle_received: "vehicle_received",
  diagnosing: "diagnosing",
  quote_provided: "quote_provided",
  awaiting_customer_approval: "awaiting_customer_approval",
  approved_parts_pickup: "approved_parts_pickup",
  in_progress: "in_progress",
  completed_pending_confirmation: "completed_pending_confirmation",
  confirmed: "confirmed",
  disputed: "disputed",
  refunded: "refunded",
  cancelled: "cancelled",
  cancelled_after_diagnosis: "cancelled_after_diagnosis",
  no_show_pending_review: "no_show_pending_review",
} as const satisfies Record<string, JobsStatus>;

export type JobStatus = JobsStatus;

export function getMatchTier(job: JobLike): number {
  return resolveFields(job).match_tier ?? 1;
}

export function isMatchedBroadcast(status: JobsStatus): boolean {
  return status === JOB_STATUS.matched_awaiting_response;
}

export function isQuotePendingAdmin(job: JobFieldsLike): boolean {
  const fields = resolveFields(job);
  return (
    fields.status === JOB_STATUS.quote_provided && fields.parts_cost_flagged === true
  );
}

export function isQuoteSubmitted(job: JobFieldsLike): boolean {
  const fields = resolveFields(job);
  return (
    fields.status === JOB_STATUS.quote_provided && fields.parts_cost_flagged !== true
  );
}

export function isRequoteSubmitted(job: JobFieldsLike): boolean {
  const fields = resolveFields(job);
  if (fields.status !== JOB_STATUS.awaiting_customer_approval) {
    return false;
  }
  return parseQuoteDetails(fields.quote_details).requote === true;
}

export function isAwaitingPartsConsent(job: JobFieldsLike): boolean {
  const fields = resolveFields(job);
  if (fields.status !== JOB_STATUS.awaiting_customer_approval) {
    return false;
  }
  const details = parseQuoteDetails(fields.quote_details);
  return details.non_oem_or_used_parts === true && !details.non_oem_consent_at;
}

export function isQuoteApproved(status: JobsStatus): boolean {
  return (
    status === JOB_STATUS.awaiting_customer_approval ||
    status === JOB_STATUS.approved_parts_pickup
  );
}
