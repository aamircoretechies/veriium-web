import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { sendSms } from "@/lib/twilio/sms";
import { serviceRequoteDriver } from "@/lib/twilio/templates";
import { scheduleRequoteTimeout } from "./schedule";

async function notifyDriverRequote(
  jobId: string,
  previousPartsCost: number,
): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  const quoteAmount = job.fields.quote_amount ?? 0;
  const newPartsCost = job.fields.parts_cost ?? 0;
  const reason = job.fields.requote_reason;

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone,
      serviceRequoteDriver({
        quoteAmount,
        previousPartsCost,
        newPartsCost,
        reason,
      }),
    );
  } catch (error) {
    console.error(
      `[requotes/release] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

/**
 * Notify driver of revised parts quote and schedule 2h timeout.
 * Called when status becomes `requote_submitted`.
 */
export async function releaseRequoteToDriver(
  jobId: string,
  previousPartsCost: number,
): Promise<void> {
  await notifyDriverRequote(jobId, previousPartsCost);
  await scheduleRequoteTimeout(jobId);
}
