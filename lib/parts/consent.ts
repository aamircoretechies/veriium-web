import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
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

/** Send consent SMS after driver APPROVE when non-OEM/used parts are proposed (§5.8). */
export async function sendPartsConsentSms(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone,
      partsConsentDriver(job.fields.non_oem_parts_description),
    );
  } catch (error) {
    console.error(
      `[parts/consent] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

/**
 * Driver YES while `awaiting_parts_consent` — set consent timestamp and resume
 * the standard post-approve path (on_hand auto-start or wait for STARTED).
 */
export async function grantPartsConsent(
  jobId: string,
): Promise<DriverPartsConsentResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "awaiting_parts_consent") {
    throw new InvalidPartsConsentError(job.fields.status);
  }

  const now = new Date().toISOString();
  await updateJobStatus(jobId, { non_oem_consent_at: now });

  if (job.fields.on_hand) {
    const updated = await updateJobStatus(jobId, { status: "in_progress" });
    return {
      jobId,
      status: updated.fields.status,
      action: "in_progress",
    };
  }

  const updated = await updateJobStatus(jobId, { status: "quote_approved" });
  return {
    jobId,
    status: updated.fields.status,
    action: "quote_approved",
  };
}
