import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  assertMechanicAssigned,
  isMobileRepair,
  type ServiceCommandResult,
} from "../guards";
import { InvalidServiceCommandError, WrongServiceTypeError } from "../errors";

/** ENROUTE — mobile jobs only: `accepted_by_mechanic` → `en_route`. */
export async function handleEnRoute(
  jobId: string,
  mechanicId: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (!isMobileRepair(job)) {
    throw new WrongServiceTypeError(jobId, "mobile_repair", "ENROUTE");
  }

  if (job.fields.status !== "accepted_by_mechanic") {
    throw new InvalidServiceCommandError("ENROUTE", job.fields.status);
  }

  const updated = await updateJobStatus(jobId, { status: "en_route" });

  return {
    jobId,
    status: updated.fields.status,
    action: "en_route",
  };
}
