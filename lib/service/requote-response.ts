import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { createDiagnosticFeeIntent } from "@/lib/payments/diagnostic-fee";
import { createInstalledPartsIntent } from "@/lib/payments/installed-parts";
import { findPaymentByIdempotencyKey } from "@/lib/payments/record";
import { cancelRequoteTimeout } from "@/lib/requotes/schedule";
import { diagnosticKey } from "@/lib/stripe/idempotency";
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
): "in_progress" | "quote_approved" {
  return inProgressAt ? "in_progress" : "quote_approved";
}

async function notifyDriverRequoteDeclined(
  jobId: string,
  installedPartsCharge: number,
  diagnosticCharged: boolean,
): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone,
      serviceRequoteDeclinedDriver({ installedPartsCharge, diagnosticCharged }),
    );
  } catch (error) {
    console.error(
      `[service/requote-response] Failed to notify driver of decline for job ${jobId}:`,
      error,
    );
  }
}

/** APPROVE → resume work with updated parts cost (§5.5). */
export async function approveRequote(
  jobId: string,
): Promise<DriverRequoteResponseResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "requote_submitted") {
    throw new InvalidDriverRequoteResponseError("APPROVE", job.fields.status);
  }

  await cancelRequoteTimeout(jobId);

  const returnStatus = resolveReturnStatus(job.fields.in_progress_at);
  const now = new Date().toISOString();

  const updated = await updateJobStatus(jobId, {
    status: returnStatus,
    requote_approved_at: now,
  });

  return {
    jobId,
    status: updated.fields.status,
    action: returnStatus,
  };
}

/** DECLINE → charge installed parts + diagnostic if needed → cancelled (§5.5). */
export async function declineRequote(
  jobId: string,
): Promise<DriverRequoteResponseResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "requote_submitted") {
    throw new InvalidDriverRequoteResponseError("DECLINE", job.fields.status);
  }

  await cancelRequoteTimeout(jobId);

  const installedPartsCharge =
    job.fields.receipt_status === "submitted"
      ? (job.fields.receipt_total ?? 0)
      : 0;

  const existingDiagnostic = await findPaymentByIdempotencyKey(
    diagnosticKey(jobId),
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
  const existingDetails = job.fields.additional_details?.trim();
  const additionalDetails = existingDetails
    ? `${existingDetails}\n\n${onHandNote}`
    : onHandNote;

  const now = new Date().toISOString();
  const updated = await updateJobStatus(jobId, {
    status: "cancelled",
    requote_declined_at: now,
    additional_details: additionalDetails,
    on_hand: true,
  });

  await notifyDriverRequoteDeclined(
    jobId,
    installedPartsCharge,
    !diagnosticAlreadyCharged,
  );

  return {
    jobId,
    status: updated.fields.status,
    action: "cancelled",
  };
}
