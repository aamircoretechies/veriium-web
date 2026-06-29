import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { assertMechanicAssigned } from "@/lib/service/guards";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import { isReceiptEligibleStatus } from "./eligibility";
import {
  ReceiptAlreadySubmittedError,
  ReceiptNotEligibleError,
} from "./errors";

export type SubmitReceiptInput = {
  jobId: string;
  mechanicId: string;
  receiptUrl: string;
  source: "mms" | "web";
};

export type SubmitReceiptResult = {
  jobId: string;
  receiptStatus: "submitted";
  receiptUrl: string;
  source: "mms" | "web";
};

function canAcceptReceipt(job: AirtableRecord<JobFields>): boolean {
  const status = job.fields.receipt_status;
  if (status === "submitted") {
    return false;
  }
  return status === "pending" || status === "overdue" || status === "invalid" || !status;
}

/**
 * Save a parts receipt URL on the job (Exhibit A §5.3).
 * Shared by MMS inbound and web upload.
 */
export async function submitReceipt(
  input: SubmitReceiptInput,
): Promise<SubmitReceiptResult> {
  const job = await getJobById(input.jobId);
  assertMechanicAssigned(job, input.mechanicId);

  if (!isReceiptEligibleStatus(job.fields.status)) {
    throw new ReceiptNotEligibleError(
      input.jobId,
      `job status is ${job.fields.status}`,
    );
  }

  if (!canAcceptReceipt(job)) {
    throw new ReceiptAlreadySubmittedError(input.jobId);
  }

  const now = new Date().toISOString();

  await updateJobStatus(input.jobId, {
    receipt_url: input.receiptUrl,
    receipt_status: "submitted",
    receipt_submitted_at: now,
    ...(job.fields.receipt_status !== "overdue"
      ? { parts_reimbursement_forfeited: false }
      : {}),
  });

  return {
    jobId: input.jobId,
    receiptStatus: "submitted",
    receiptUrl: input.receiptUrl,
    source: input.source,
  };
}
