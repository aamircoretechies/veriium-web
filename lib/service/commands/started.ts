import { getJobById } from "@/lib/jobs/lookup";
import { isQuoteApproved, JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "../guards";
import { InvalidServiceCommandError } from "../errors";

export async function handleStarted(
  jobId: string,
  mechanicId: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (!isQuoteApproved(job.fields.status ?? JOB_STATUS.draft)) {
    throw new InvalidServiceCommandError("STARTED", jobStatusOr(job.fields.status));
  }

  const updated = await updateJobStatus(jobId, { status: JOB_STATUS.in_progress });

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "in_progress",
  };
}
