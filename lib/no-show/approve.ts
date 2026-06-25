import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { markMechanicAvailable } from "@/lib/matching/mechanic-update";
import { createCancellationFeeIntent } from "@/lib/payments/cancellation-fee";
import type { JobStatus } from "@/types/airtable/enums";

export class InvalidNoShowApprovalError extends Error {
  readonly jobId: string;
  readonly jobStatus: JobStatus;

  constructor(jobId: string, jobStatus: JobStatus) {
    super(
      `No-show approval is not valid for job ${jobId} in status ${jobStatus}`,
    );
    this.name = "InvalidNoShowApprovalError";
    this.jobId = jobId;
    this.jobStatus = jobStatus;
  }
}

export type ApproveNoShowResult = {
  jobId: string;
  status: string;
  action: "cancelled";
};

/** Admin approves no-show report — charge cancellation fee and cancel job (§9.2). */
export async function approveNoShow(jobId: string): Promise<ApproveNoShowResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "no_show_pending_review") {
    throw new InvalidNoShowApprovalError(jobId, job.fields.status);
  }

  await createCancellationFeeIntent(jobId);

  const updated = await updateJobStatus(jobId, { status: "cancelled" });

  const mechanicId = job.fields.mechanic?.[0];
  if (mechanicId) {
    await markMechanicAvailable(mechanicId);
  }

  return {
    jobId,
    status: updated.fields.status,
    action: "cancelled",
  };
}
