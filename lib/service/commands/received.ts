import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  assertMechanicAssigned,
  isDropoff,
  type ServiceCommandResult,
} from "../guards";
import { InvalidServiceCommandError, WrongServiceTypeError } from "../errors";

/** RECEIVED — drop-off jobs: `accepted_by_mechanic` → `vehicle_received`. */
export async function handleReceived(
  jobId: string,
  mechanicId: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (!isDropoff(job)) {
    throw new WrongServiceTypeError(jobId, "dropoff", "RECEIVED");
  }

  if (job.fields.status !== "accepted_by_mechanic") {
    throw new InvalidServiceCommandError("RECEIVED", job.fields.status);
  }

  const updated = await updateJobStatus(jobId, { status: "vehicle_received" });

  return {
    jobId,
    status: updated.fields.status,
    action: "vehicle_received",
  };
}
