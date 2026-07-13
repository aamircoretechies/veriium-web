import { getJobById } from "@/lib/jobs/lookup";
import { isQuotePendingAdmin, JOB_STATUS } from "@/lib/jobs/status";
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

export async function approveQuoteParts(
  jobId: string,
): Promise<ApproveQuotePartsResult> {
  const job = await getJobById(jobId);

  if (!isQuotePendingAdmin(job)) {
    throw new InvalidQuotePartsApprovalError(
      jobId,
      job.fields.status ?? JOB_STATUS.draft,
    );
  }

  const updated = await updateJobStatus(jobId, {
    status: JOB_STATUS.quote_provided,
    parts_cost_flagged: false,
  });
  await releaseQuoteToDriver(jobId);

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "quote_submitted",
  };
}
