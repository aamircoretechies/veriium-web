import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import { MechanicNotAssignedError } from "@/lib/matching/errors";

export type ServiceCommandResult = {
  jobId: string;
  status: string;
  action: string;
};

export function mechanicLinkedToJob(
  job: AirtableRecord<JobFields>,
  mechanicId: string,
): boolean {
  return job.fields.mechanic?.includes(mechanicId) ?? false;
}

export function assertMechanicAssigned(
  job: AirtableRecord<JobFields>,
  mechanicId: string,
): void {
  if (!mechanicLinkedToJob(job, mechanicId)) {
    throw new MechanicNotAssignedError(job.id, mechanicId);
  }
}

export function isMobileRepair(job: AirtableRecord<JobFields>): boolean {
  return job.fields.service_type === "mobile_repair";
}

export function isDropoff(job: AirtableRecord<JobFields>): boolean {
  return job.fields.service_type === "dropoff";
}
