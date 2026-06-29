import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { jobRequiresReceipt } from "@/lib/receipts/eligibility";
import { scheduleReceiptDeadlineCheck } from "@/lib/receipts/schedule";
import { sendSms } from "@/lib/twilio/sms";
import { serviceQuoteDriver } from "@/lib/twilio/templates";
import { scheduleQuoteTimeout } from "./schedule";

async function notifyDriverQuote(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  const quoteAmount = job.fields.quote_amount ?? 0;
  const partsCost = job.fields.parts_cost ?? 0;
  const onHand = job.fields.on_hand ?? false;

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone,
      serviceQuoteDriver({ quoteAmount, partsCost, onHand }),
    );
  } catch (error) {
    console.error(
      `[quotes/release] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

/**
 * Notify driver of quote, schedule receipt deadline (if needed), and 2h timeout.
 * Called when status becomes `quote_submitted` (normal quote or admin release).
 */
export async function releaseQuoteToDriver(jobId: string): Promise<void> {
  const job = await getJobById(jobId);

  if (jobRequiresReceipt(job.fields)) {
    await scheduleReceiptDeadlineCheck(jobId);
  }

  await notifyDriverQuote(jobId);
  await scheduleQuoteTimeout(jobId);
}
