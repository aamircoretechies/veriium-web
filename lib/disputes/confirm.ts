import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { markMechanicAvailable } from "@/lib/matching/mechanic-update";
import { captureFinalPayment } from "@/lib/payments/capture-final";
import type { JobStatus } from "@/types/airtable/enums";

const CONFIRMABLE_STATUSES = new Set<JobStatus>([
  "completed_pending_confirmation",
  "disputed",
]);

export class InvalidDriverConfirmError extends Error {
  readonly jobId: string;
  readonly jobStatus: JobStatus;

  constructor(jobId: string, jobStatus: JobStatus) {
    super(
      `Driver confirm is not valid for job ${jobId} in status ${jobStatus}`,
    );
    this.name = "InvalidDriverConfirmError";
    this.jobId = jobId;
    this.jobStatus = jobStatus;
  }
}

export type ConfirmJobResult = {
  jobId: string;
  status: string;
  action: "confirmed";
};

/** Driver replies `2` — capture final PI and mark job confirmed (§9.3). */
export async function confirmJob(jobId: string): Promise<ConfirmJobResult> {
  const job = await getJobById(jobId);

  if (!CONFIRMABLE_STATUSES.has(job.fields.status)) {
    throw new InvalidDriverConfirmError(jobId, job.fields.status);
  }

  await captureFinalPayment(jobId);

  const updated = await updateJobStatus(jobId, { status: "confirmed" });

  const mechanicId = job.fields.mechanic_id?.[0];
  if (mechanicId) {
    await markMechanicAvailable(mechanicId);
  }

  return {
    jobId,
    status: updated.fields.status,
    action: "confirmed",
  };
}
