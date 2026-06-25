import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { scheduleNoShowCheck } from "@/lib/no-show/schedule";
import {
  assertMechanicAssigned,
  isMobileRepair,
  type ServiceCommandResult,
} from "../guards";
import { InvalidServiceCommandError, WrongServiceTypeError } from "../errors";

/** ARRIVED — mobile jobs: `en_route` → `arrived`; schedules no-show check (+15 min). */
export async function handleArrived(
  jobId: string,
  mechanicId: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (!isMobileRepair(job)) {
    throw new WrongServiceTypeError(jobId, "mobile_repair", "ARRIVED");
  }

  if (job.fields.status !== "en_route") {
    throw new InvalidServiceCommandError("ARRIVED", job.fields.status);
  }

  const updated = await updateJobStatus(jobId, { status: "arrived" });
  await scheduleNoShowCheck(jobId);

  return {
    jobId,
    status: updated.fields.status,
    action: "arrived",
  };
}
