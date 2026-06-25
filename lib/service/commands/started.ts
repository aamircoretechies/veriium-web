import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "../guards";
import { InvalidServiceCommandError } from "../errors";

/** STARTED — `quote_approved` → `in_progress` when not auto-started via ON_HAND. */
export async function handleStarted(
  jobId: string,
  mechanicId: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (job.fields.status !== "quote_approved") {
    throw new InvalidServiceCommandError("STARTED", job.fields.status);
  }

  const updated = await updateJobStatus(jobId, { status: "in_progress" });

  return {
    jobId,
    status: updated.fields.status,
    action: "in_progress",
  };
}
