import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { createDiagnosticFeeIntent } from "@/lib/payments/diagnostic-fee";
import type { JobStatus } from "@/types/airtable/enums";

export class InvalidDriverQuoteResponseError extends Error {
  readonly command: "APPROVE" | "DECLINE";
  readonly jobStatus: JobStatus;

  constructor(command: "APPROVE" | "DECLINE", jobStatus: JobStatus) {
    super(
      `Driver ${command} is not valid for job status ${jobStatus}`,
    );
    this.name = "InvalidDriverQuoteResponseError";
    this.command = command;
    this.jobStatus = jobStatus;
  }
}

export type DriverQuoteResponseResult = {
  jobId: string;
  status: string;
  action: "quote_approved" | "in_progress" | "cancelled";
};

/** APPROVE → `quote_approved`; auto-start `in_progress` when parts are on hand (§7.2). */
export async function approveQuote(
  jobId: string,
): Promise<DriverQuoteResponseResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "quote_submitted") {
    throw new InvalidDriverQuoteResponseError("APPROVE", job.fields.status);
  }

  await updateJobStatus(jobId, { status: "quote_approved" });

  if (job.fields.on_hand) {
    const updated = await updateJobStatus(jobId, { status: "in_progress" });
    return {
      jobId,
      status: updated.fields.status,
      action: "in_progress",
    };
  }

  const updated = await getJobById(jobId);
  return {
    jobId,
    status: updated.fields.status,
    action: "quote_approved",
  };
}

/** DECLINE → diagnostic fee PI → `quote_declined` → `cancelled` (§7.3). */
export async function declineQuote(
  jobId: string,
): Promise<DriverQuoteResponseResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "quote_submitted") {
    throw new InvalidDriverQuoteResponseError("DECLINE", job.fields.status);
  }

  await createDiagnosticFeeIntent(jobId);
  await updateJobStatus(jobId, { status: "quote_declined" });
  const updated = await updateJobStatus(jobId, { status: "cancelled" });

  return {
    jobId,
    status: updated.fields.status,
    action: "cancelled",
  };
}
