import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails, parseQuoteDetails } from "@/lib/jobs/quote-details";
import { isAwaitingPartsConsent, JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendSms } from "@/lib/twilio/sms";
import { partsConsentDriver } from "@/lib/twilio/templates";
import type { JobStatus } from "@/types/airtable/enums";

export class InvalidPartsConsentError extends Error {
  readonly jobStatus: JobStatus;

  constructor(jobStatus: JobStatus) {
    super(`Parts consent YES is not valid for job status ${jobStatus}`);
    this.name = "InvalidPartsConsentError";
    this.jobStatus = jobStatus;
  }
}

export type DriverPartsConsentResult = {
  jobId: string;
  status: string;
  action: "quote_approved" | "in_progress";
};

export async function sendPartsConsentSms(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return;
  }

  const description =
    parseQuoteDetails(job.fields.quote_details).non_oem_parts_description;

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone_number,
      partsConsentDriver(description),
    );
  } catch (error) {
    console.error(
      `[parts/consent] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

export async function grantPartsConsent(
  jobId: string,
): Promise<DriverPartsConsentResult> {
  const job = await getJobById(jobId);

  if (!isAwaitingPartsConsent(job)) {
    throw new InvalidPartsConsentError(jobStatusOr(job.fields.status));
  }

  const now = new Date().toISOString();
  await updateJobStatus(jobId, {
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      non_oem_consent_at: now,
    }),
  });

  if (job.fields.quote_parts_on_hand) {
    const updated = await updateJobStatus(jobId, { status: JOB_STATUS.in_progress });
    return {
      jobId,
      status: updated.fields.status ?? "",
      action: "in_progress",
    };
  }

  const updated = await updateJobStatus(jobId, {
    status: JOB_STATUS.awaiting_customer_approval,
  });
  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "quote_approved",
  };
}
