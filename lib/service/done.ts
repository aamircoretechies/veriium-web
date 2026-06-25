import { getDriverById } from "@/lib/drivers/lookup";
import { scheduleDisputeReminders } from "@/lib/disputes/schedule";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { createFinalPaymentIntent } from "@/lib/payments/final-intent";
import { sendSms } from "@/lib/twilio/sms";
import { serviceDoneDriver } from "@/lib/twilio/templates";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "./guards";
import { InvalidServiceCommandError } from "./errors";
import { parseQuoteLine } from "./quote-parse";

async function notifyDriverDone(
  jobId: string,
  finalPrice: number,
): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(driver.fields.phone, serviceDoneDriver(finalPrice));
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

  await updateJobStatus(jobId, {
    quote_amount: parsed.quoteAmount,
    parts_cost: parsed.partsCost,
    final_price: parsed.finalPrice,
    mechanic_payout: parsed.mechanicPayout,
    platform_fee: parsed.platformFee,
  });

  await createFinalPaymentIntent(jobId);

  const updated = await updateJobStatus(jobId, {
    status: "completed_pending_confirmation",
  });

  await notifyDriverDone(jobId, parsed.finalPrice);
  await scheduleDisputeReminders(jobId);

  return {
    jobId,
    status: updated.fields.status,
    action: "completed_pending_confirmation",
  };
}
