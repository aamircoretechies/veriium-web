import { createCancellationReviewActionItem } from "@/lib/action-items/create";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import {
  InvalidJobTransitionError,
  assertPaymentTransition,
  assertServiceTransition,
  assertTransition,
  isMatchingPhaseStatus,
  isPaymentPhaseStatus,
  isServicePhaseStatus,
} from "@/lib/jobs/transitions";
import { markMechanicAvailable } from "@/lib/matching/mechanic-update";
import { getMechanicById } from "@/lib/mechanics/lookup";
import { createCancellationFeeIntent } from "@/lib/payments/cancellation-fee";
import { createPartsCancellationIntent } from "@/lib/payments/parts-cancellation";
import { sendSms } from "@/lib/twilio/sms";
import {
  cancellationDriver,
  cancellationMechanic,
} from "@/lib/twilio/templates";
import type { JobStatus } from "@/types/airtable/enums";
import { isLateCancellation } from "./fee-window";
import {
  resolvePartsCancelAmount,
  shouldChargePartsOnCancel,
} from "./parts-charge";

export type CancelJobResult = {
  jobId: string;
  status: string;
  action: "cancelled";
  feeCharged: boolean;
  partsCharged: boolean;
  partsChargeAmount?: number;
};

export class JobNotCancellableError extends Error {
  readonly jobId: string;
  readonly jobStatus: JobStatus;

  constructor(jobId: string, jobStatus: JobStatus, message?: string) {
    super(
      message ??
        `Job ${jobId} in status ${jobStatus} cannot be cancelled.`,
    );
    this.name = "JobNotCancellableError";
    this.jobId = jobId;
    this.jobStatus = jobStatus;
  }
}

function assertJobCancellable(jobId: string, status: JobStatus): void {
  if (status === "cancelled") {
    throw new JobNotCancellableError(
      jobId,
      status,
      `Job ${jobId} is already cancelled.`,
    );
  }

  try {
    if (isPaymentPhaseStatus(status)) {
      assertPaymentTransition(status, "cancelled");
    } else if (isServicePhaseStatus(status)) {
      assertServiceTransition(status, "cancelled");
    } else if (isMatchingPhaseStatus(status)) {
      assertTransition(status, "cancelled");
    } else {
      throw new JobNotCancellableError(jobId, status);
    }
  } catch (error) {
    if (error instanceof InvalidJobTransitionError) {
      throw new JobNotCancellableError(jobId, status);
    }
    throw error;
  }
}

async function notifyCancellationParties(
  jobId: string,
  feeCharged: boolean,
  partsCharged: boolean,
  partsChargeAmount: number,
): Promise<void> {
  const job = await getJobById(jobId);

  const driverId = job.fields.driver_id?.[0];
  if (driverId) {
    try {
      const driver = await getDriverById(driverId);
      if (driver.fields.phone_number) {
        await sendSms(
          driver.fields.phone_number,
          cancellationDriver({
            feeCharged,
            partsCharge: partsCharged ? partsChargeAmount : 0,
          }),
        );
      }
    } catch (error) {
      console.error(
        `[cancellation/cancel-job] Driver SMS failed for job ${jobId}:`,
        error,
      );
    }
  }

  const mechanicId = job.fields.mechanic_id?.[0];
  if (mechanicId) {
    try {
      const mechanic = await getMechanicById(mechanicId);
      if (mechanic.fields.phone_number) {
        await sendSms(
          mechanic.fields.phone_number,
          cancellationMechanic(partsCharged),
        );
      }
    } catch (error) {
      console.error(
        `[cancellation/cancel-job] Mechanic SMS failed for job ${jobId}:`,
        error,
      );
    }
  }
}

/**
 * Cancel a job, charging the $50 late-cancel fee when inside the fee window (§9.1)
 * and installed parts when quote was approved with a valid receipt (Exhibit A §5.6).
 */
export async function cancelJob(jobId: string): Promise<CancelJobResult> {
  const job = await getJobById(jobId);
  assertJobCancellable(jobId, job.fields.status);

  const lateCancel = isLateCancellation(job.fields.scheduled_time);
  let feeCharged = false;
  let partsCharged = false;
  let partsChargeAmount = 0;

  if (lateCancel) {
    try {
      await createCancellationFeeIntent(jobId);
      feeCharged = true;
    } catch (error) {
      console.error(
        `[cancellation/cancel-job] Cancellation fee failed for job ${jobId}:`,
        error,
      );

      await createCancellationReviewActionItem({
        jobId: job.id,
        title: "Late cancellation fee failed",
        notes: `Could not charge cancellation fee for job ${jobId}.`,
        driver: job.fields.driver_id,
        mechanic: job.fields.mechanic_id,
      });
    }
  }

  if (shouldChargePartsOnCancel(job.fields)) {
    partsChargeAmount = resolvePartsCancelAmount(job.fields);
    try {
      const result = await createPartsCancellationIntent(
        jobId,
        partsChargeAmount,
      );
      if (result) {
        partsCharged = true;
      }
    } catch (error) {
      console.error(
        `[cancellation/cancel-job] Parts cancellation charge failed for job ${jobId}:`,
        error,
      );

      await createCancellationReviewActionItem({
        jobId: job.id,
        title: "Cancellation parts charge failed",
        notes: `Could not charge installed parts ($${partsChargeAmount.toFixed(2)}) for job ${jobId}.`,
        driver: job.fields.driver_id,
        mechanic: job.fields.mechanic_id,
      });
    }
  }

  const updated = await updateJobStatus(jobId, { status: "cancelled" });

  await notifyCancellationParties(
    jobId,
    feeCharged,
    partsCharged,
    partsChargeAmount,
  );

  const mechanicId = job.fields.mechanic_id?.[0];
  if (mechanicId) {
    await markMechanicAvailable(mechanicId);
  }

  return {
    jobId,
    status: updated.fields.status,
    action: "cancelled",
    feeCharged,
    partsCharged,
    ...(partsCharged ? { partsChargeAmount } : {}),
  };
}
