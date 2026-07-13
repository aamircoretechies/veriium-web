import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { JOB_STATUS } from "@/lib/jobs/status";
import { getNoShowDelaySeconds } from "@/lib/edge/constants";

export function isNoShowEligible(job: AirtableRecord<JobFields>): boolean {
  if (job.fields.status !== JOB_STATUS.arrived) {
    return false;
  }

  const arrivedAt = parseQuoteDetails(job.fields.quote_details).arrived_at;
  if (!arrivedAt) {
    return false;
  }

  const eligibleAfterMs =
    new Date(arrivedAt).getTime() + getNoShowDelaySeconds() * 1000;

  return Date.now() >= eligibleAfterMs;
}
