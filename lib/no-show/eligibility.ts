import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import { getNoShowDelaySeconds } from "@/lib/edge/constants";

/** True when the job is `arrived` and the no-show window has elapsed (§9.2). */
export function isNoShowEligible(job: AirtableRecord<JobFields>): boolean {
  if (job.fields.status !== "arrived") {
    return false;
  }

  const arrivedAt = job.fields.arrived_at;
  if (!arrivedAt) {
    return false;
  }

  const eligibleAfterMs =
    new Date(arrivedAt).getTime() + getNoShowDelaySeconds() * 1000;

  return Date.now() >= eligibleAfterMs;
}
