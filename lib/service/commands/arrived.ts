import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails } from "@/lib/jobs/quote-details";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import { scheduleNoShowCheck } from "@/lib/no-show/schedule";
import {
  assertMechanicAssigned,
  isMobileRepair,
  type ServiceCommandResult,
} from "../guards";
import { InvalidServiceCommandError, WrongServiceTypeError } from "../errors";

export async function handleArrived(
  jobId: string,
  mechanicId: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (!isMobileRepair(job)) {
    throw new WrongServiceTypeError(jobId, "mobile_repair", "ARRIVED");
  }

  if (job.fields.status !== JOB_STATUS.en_route) {
    throw new InvalidServiceCommandError("ARRIVED", jobStatusOr(job.fields.status));
  }

  const now = new Date().toISOString();
  const updated = await updateJobStatus(jobId, {
    status: JOB_STATUS.arrived,
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      arrived_at: now,
    }),
  });
  await scheduleNoShowCheck(jobId);

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "arrived",
  };
}
