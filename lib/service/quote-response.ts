import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
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
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(driver.fields.phone, serviceQuoteDeclinedDriver());
  } catch (error) {
    console.error(
      `[service/quote-response] Failed to notify driver of decline for job ${jobId}:`,
      error,
    );
  }
}

/** APPROVE → `quote_approved`; auto-start `in_progress` when parts are on hand (§7.2). */
export async function approveQuote(
  jobId: string,
): Promise<DriverQuoteResponseResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "quote_submitted") {
    throw new InvalidDriverQuoteResponseError("APPROVE", job.fields.status);
  }

  await cancelQuoteTimeout(jobId);

  const originalPartsCost =
    job.fields.original_parts_cost ?? job.fields.parts_cost;

  await updateJobStatus(jobId, {
    status: "quote_approved",
    ...(originalPartsCost !== undefined
      ? { original_parts_cost: originalPartsCost }
      : {}),
  });

  if (job.fields.non_oem_or_used_parts) {
    const updated = await updateJobStatus(jobId, {
      status: "awaiting_parts_consent",
    });
    await sendPartsConsentSms(jobId);
    return {
      jobId,
      status: updated.fields.status,
      action: "awaiting_parts_consent",
    };
  }

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

  await cancelQuoteTimeout(jobId);
  await createDiagnosticFeeIntent(jobId);
  await updateJobStatus(jobId, { status: "quote_declined" });
  const updated = await updateJobStatus(jobId, { status: "cancelled" });

  await notifyDriverQuoteDeclined(jobId);

  return {
    jobId,
    status: updated.fields.status,
    action: "cancelled",
  };
}
