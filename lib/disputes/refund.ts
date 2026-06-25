import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { markMechanicAvailable } from "@/lib/matching/mechanic-update";
import { refundFinalPayment } from "@/lib/payments/refund";
import type { JobStatus } from "@/types/airtable/enums";

export class InvalidJobRefundError extends Error {
  readonly jobId: string;
  readonly jobStatus: JobStatus;

  constructor(jobId: string, jobStatus: JobStatus) {
    super(`Job refund is not valid for job ${jobId} in status ${jobStatus}`);
    this.name = "InvalidJobRefundError";
    this.jobId = jobId;
    this.jobStatus = jobStatus;
  }
}

export type RefundJobResult = {
  jobId: string;
  status: string;
  action: "refunded";
};

/** Admin resolves dispute with refund — release final PI and mark job refunded (§9.3). */
export async function refundJob(jobId: string): Promise<RefundJobResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "disputed") {
    throw new InvalidJobRefundError(jobId, job.fields.status);
  }

  await refundFinalPayment(jobId);

  const updated = await updateJobStatus(jobId, { status: "refunded" });

  const mechanicId = job.fields.mechanic?.[0];
  if (mechanicId) {
    await markMechanicAvailable(mechanicId);
  }

  return {
    jobId,
    status: updated.fields.status,
    action: "refunded",
  };
}
