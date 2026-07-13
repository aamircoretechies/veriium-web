import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails, parseQuoteDetails } from "@/lib/jobs/quote-details";
import {
  isQuoteSubmitted,
  JOB_STATUS,
  jobStatusOr,
} from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendPartsConsentSms } from "@/lib/parts/consent";
import { createDiagnosticFeeIntent } from "@/lib/payments/diagnostic-fee";
import { cancelQuoteTimeout } from "@/lib/quotes/schedule";
import { sendSms } from "@/lib/twilio/sms";
import { serviceQuoteDeclinedDriver } from "@/lib/twilio/templates";
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
  action: "quote_approved" | "in_progress" | "awaiting_parts_consent" | "cancelled";
};

async function notifyDriverQuoteDeclined(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(driver.fields.phone_number, serviceQuoteDeclinedDriver());
  } catch (error) {
    console.error(
      `[service/quote-response] Failed to notify driver of decline for job ${jobId}:`,
      error,
    );
  }
}

export async function approveQuote(
  jobId: string,
): Promise<DriverQuoteResponseResult> {
  const job = await getJobById(jobId);

  if (!isQuoteSubmitted(job)) {
    throw new InvalidDriverQuoteResponseError(
      "APPROVE",
      jobStatusOr(job.fields.status),
    );
  }

  await cancelQuoteTimeout(jobId);

  const details = parseQuoteDetails(job.fields.quote_details);
  const originalPartsCost = details.original_parts_cost ?? job.fields.parts_cost;

  await updateJobStatus(jobId, {
    status: JOB_STATUS.awaiting_customer_approval,
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      ...(originalPartsCost !== undefined
        ? { original_parts_cost: originalPartsCost }
        : {}),
    }),
  });

  if (details.non_oem_or_used_parts) {
    const updated = await updateJobStatus(jobId, {
      status: JOB_STATUS.awaiting_customer_approval,
    });
    await sendPartsConsentSms(jobId);
    return {
      jobId,
      status: updated.fields.status ?? "",
      action: "awaiting_parts_consent",
    };
  }

  if (job.fields.quote_parts_on_hand) {
    const updated = await updateJobStatus(jobId, { status: JOB_STATUS.in_progress });
    return {
      jobId,
      status: updated.fields.status ?? "",
      action: "in_progress",
    };
  }

  const updated = await getJobById(jobId);
  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "quote_approved",
  };
}

export async function declineQuote(
  jobId: string,
): Promise<DriverQuoteResponseResult> {
  const job = await getJobById(jobId);

  if (!isQuoteSubmitted(job)) {
    throw new InvalidDriverQuoteResponseError(
      "DECLINE",
      jobStatusOr(job.fields.status),
    );
  }

  await cancelQuoteTimeout(jobId);
  await createDiagnosticFeeIntent(jobId);
  await updateJobStatus(jobId, { status: JOB_STATUS.cancelled });
  const updated = await updateJobStatus(jobId, { status: JOB_STATUS.cancelled });

  await notifyDriverQuoteDeclined(jobId);

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "cancelled",
  };
}
