import { getDriverById } from "@/lib/drivers/lookup";
import { scheduleDisputeReminders } from "@/lib/disputes/schedule";
import { getJobById } from "@/lib/jobs/lookup";
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
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone,
      serviceDoneDriver({ finalPrice, partsVariance }),
    );
  } catch (error) {
    console.error(
      `[service/done] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

/**
 * DONE $X PARTS $Y — set final price + payout; create final PI;
 * → `completed_pending_confirmation`; SMS driver; schedule dispute reminders.
 */
export async function handleDone(
  jobId: string,
  mechanicId: string,
  remainder: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (job.fields.status !== "in_progress") {
    throw new InvalidServiceCommandError("DONE", job.fields.status);
  }

  const parsed = parseQuoteLine(remainder);

  const reconciliation = reconcilePartsAtDone({
    parts_cost: job.fields.parts_cost,
    receipt_total: job.fields.receipt_total,
    on_hand: job.fields.on_hand,
  });

  if (!reconciliation.allowed) {
    if (reconciliation.blockReason === "receipt_total_missing") {
      throw new InvalidServiceCommandError(
        "DONE (receipt total required)",
        job.fields.status,
      );
    }
    throw new InvalidServiceCommandError(
      "DONE (requote required — receipt exceeds parts tolerance)",
      job.fields.status,
    );
  }

  const payout = computeServicePayout(
    parsed.quoteAmount,
    reconciliation.finalPartsCost,
  );

  await updateJobStatus(jobId, {
    quote_amount: parsed.quoteAmount,
    parts_cost: reconciliation.finalPartsCost,
    final_price: payout.finalPrice,
    mechanic_payout: payout.mechanicPayout,
    platform_fee: payout.platformFee,
    parts_variance: reconciliation.variance,
  });

  await createFinalPaymentIntent(jobId);

  const updated = await updateJobStatus(jobId, {
    status: "completed_pending_confirmation",
  });

  await notifyDriverDone(
    jobId,
    payout.finalPrice,
    reconciliation.variance,
  );
  await scheduleDisputeReminders(jobId);

  return {
    jobId,
    status: updated.fields.status,
    action: "completed_pending_confirmation",
  };
}
