import { getDriverById } from "@/lib/drivers/lookup";
import { scheduleDisputeReminders } from "@/lib/disputes/schedule";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails } from "@/lib/jobs/quote-details";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import { reconcilePartsAtDone } from "@/lib/parts/reconcile";
import { createFinalPaymentIntent } from "@/lib/payments/final-intent";
import { sendSms } from "@/lib/twilio/sms";
import { serviceDoneDriver } from "@/lib/twilio/templates";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "./guards";
import { InvalidServiceCommandError } from "./errors";
import { parseQuoteLine } from "./quote-parse";
import { computeServicePayout } from "./payout";

async function notifyDriverDone(
  jobId: string,
  finalPrice: number,
  partsVariance?: number,
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
      serviceDoneDriver({ finalPrice, partsVariance }),
    );
  } catch (error) {
    console.error(
      `[service/done] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

export async function handleDone(
  jobId: string,
  mechanicId: string,
  remainder: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (job.fields.status !== JOB_STATUS.in_progress) {
    throw new InvalidServiceCommandError(
      "DONE",
      jobStatusOr(job.fields.status),
    );
  }

  const parsed = parseQuoteLine(remainder);

  const reconciliation = reconcilePartsAtDone({
    parts_cost: job.fields.parts_cost,
    quote_parts_on_hand: job.fields.quote_parts_on_hand,
    quote_details: job.fields.quote_details,
  });

  if (!reconciliation.allowed) {
    if (reconciliation.blockReason === "receipt_total_missing") {
      throw new InvalidServiceCommandError(
        "DONE (receipt total required)",
        jobStatusOr(job.fields.status),
      );
    }
    throw new InvalidServiceCommandError(
      "DONE (requote required — receipt exceeds parts tolerance)",
      jobStatusOr(job.fields.status),
    );
  }

  const payout = computeServicePayout(
    parsed.quoteAmount,
    reconciliation.finalPartsCost,
  );

  await updateJobStatus(jobId, {
    quote_total: parsed.quoteAmount,
    parts_cost: reconciliation.finalPartsCost,
    final_price: payout.finalPrice,
    mechanic_payout: payout.mechanicPayout,
    platform_fee: payout.platformFee,
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      parts_variance: reconciliation.variance,
    }),
  });

  await createFinalPaymentIntent(jobId);

  const updated = await updateJobStatus(jobId, {
    status: JOB_STATUS.completed_pending_confirmation,
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      payout_held: true,
      parts_variance: reconciliation.variance,
    }),
  });

  await notifyDriverDone(
    jobId,
    payout.finalPrice,
    reconciliation.variance,
  );
  await scheduleDisputeReminders(jobId);

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "completed_pending_confirmation",
  };
}
