import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import type { JobStatus } from "@/types/airtable/enums";
import { releaseQuoteToDriver } from "./release";

export class InvalidQuotePartsApprovalError extends Error {
  readonly jobId: string;
  readonly jobStatus: JobStatus;

  constructor(jobId: string, jobStatus: JobStatus) {
    super(
      `Quote parts approval is not valid for job ${jobId} in status ${jobStatus}`,
    );
    this.name = "InvalidQuotePartsApprovalError";
    this.jobId = jobId;
    this.jobStatus = jobStatus;
  }
}

export type ApproveQuotePartsResult = {
  jobId: string;
  status: string;
  action: "quote_submitted";
};

/** Admin releases a high-parts quote to the driver (Exhibit A §3.4). */
export async function approveQuoteParts(
  jobId: string,
): Promise<ApproveQuotePartsResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "quote_pending_admin") {
    throw new InvalidQuotePartsApprovalError(jobId, job.fields.status);
  }

  const updated = await updateJobStatus(jobId, { status: "quote_submitted" });
  await releaseQuoteToDriver(jobId);

  return {
    jobId,
    status: updated.fields.status,
    action: "quote_submitted",
  };
}
