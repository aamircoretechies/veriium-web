import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails, parseQuoteDetails } from "@/lib/jobs/quote-details";
import {
  isRequoteSubmitted,
  JOB_STATUS,
  jobStatusOr,
} from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import { createDiagnosticFeeIntent } from "@/lib/payments/diagnostic-fee";
import { createInstalledPartsIntent } from "@/lib/payments/installed-parts";
import { findPaymentByJobAndType } from "@/lib/payments/record";
import { cancelRequoteTimeout } from "@/lib/requotes/schedule";
import { sendSms } from "@/lib/twilio/sms";
import { serviceRequoteDeclinedDriver } from "@/lib/twilio/templates";
import type { JobStatus } from "@/types/airtable/enums";

export class InvalidDriverRequoteResponseError extends Error {
  readonly command: "APPROVE" | "DECLINE";
  readonly jobStatus: JobStatus;

  constructor(command: "APPROVE" | "DECLINE", jobStatus: JobStatus) {
    super(
      `Driver ${command} is not valid for job status ${jobStatus}`,
    );
    this.name = "InvalidDriverRequoteResponseError";
    this.command = command;
    this.jobStatus = jobStatus;
  }
}

export type DriverRequoteResponseResult = {
  jobId: string;
  status: string;
  action: "in_progress" | "quote_approved" | "cancelled";
};

function resolveReturnStatus(
  inProgressAt: string | undefined,
): "in_progress" | "awaiting_customer_approval" {
  return inProgressAt ? JOB_STATUS.in_progress : JOB_STATUS.awaiting_customer_approval;
}

async function notifyDriverRequoteDeclined(
  jobId: string,
  installedPartsCharge: number,
  diagnosticCharged: boolean,
): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone_number,
      serviceRequoteDeclinedDriver({ installedPartsCharge, diagnosticCharged }),
    );
  } catch (error) {
    console.error(
      `[service/requote-response] Failed to notify driver of decline for job ${jobId}:`,
      error,
    );
  }
}

export async function approveRequote(
  jobId: string,
): Promise<DriverRequoteResponseResult> {
  const job = await getJobById(jobId);

  if (!isRequoteSubmitted(job)) {
    throw new InvalidDriverRequoteResponseError(
      "APPROVE",
      jobStatusOr(job.fields.status),
    );
  }

  await cancelRequoteTimeout(jobId);

  const details = parseQuoteDetails(job.fields.quote_details);
  const returnStatus = resolveReturnStatus(details.in_progress_at);
  const now = new Date().toISOString();

  const updated = await updateJobStatus(jobId, {
    status: returnStatus,
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      requote: false,
      requote_approved_at: now,
    }),
  });

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: returnStatus === JOB_STATUS.in_progress ? "in_progress" : "quote_approved",
  };
}

export async function declineRequote(
  jobId: string,
): Promise<DriverRequoteResponseResult> {
  const job = await getJobById(jobId);

  if (!isRequoteSubmitted(job)) {
    throw new InvalidDriverRequoteResponseError(
      "DECLINE",
      jobStatusOr(job.fields.status),
    );
  }

  await cancelRequoteTimeout(jobId);

  const details = parseQuoteDetails(job.fields.quote_details);
  const installedPartsCharge =
    details.receipt_status === "submitted"
      ? (details.receipt_total ?? 0)
      : 0;

  const existingDiagnostic = await findPaymentByJobAndType(
    jobId,
    "diagnostic_fee",
  );
  const diagnosticAlreadyCharged =
    existingDiagnostic?.fields.status === "succeeded";

  if (!diagnosticAlreadyCharged) {
    await createDiagnosticFeeIntent(jobId);
  }

  if (installedPartsCharge > 0) {
    await createInstalledPartsIntent(jobId, installedPartsCharge);
  }

  const onHandNote =
    "Unused parts retained by mechanic as ON_HAND inventory per Veriium policy.";
  const existingDetails = job.fields.issue_text?.trim();
  const additionalDetails = existingDetails
    ? `${existingDetails}\n\n${onHandNote}`
    : onHandNote;

  const now = new Date().toISOString();
  const updated = await updateJobStatus(jobId, {
    status: JOB_STATUS.cancelled,
    issue_text: additionalDetails,
    quote_parts_on_hand: true,
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      requote_declined_at: now,
      requote: false,
    }),
  });

  await notifyDriverRequoteDeclined(
    jobId,
    installedPartsCharge,
    !diagnosticAlreadyCharged,
  );

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "cancelled",
  };
}
