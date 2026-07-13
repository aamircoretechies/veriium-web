import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { sendSms } from "@/lib/twilio/sms";
import { serviceRequoteDriver } from "@/lib/twilio/templates";
import { scheduleRequoteTimeout } from "./schedule";

async function notifyDriverRequote(
  jobId: string,
  previousPartsCost: number,
): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return;
  }

  const quoteAmount = job.fields.quote_total ?? 0;
  const newPartsCost = job.fields.parts_cost ?? 0;
  const reason = parseQuoteDetails(job.fields.quote_details).requote_reason;

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone_number,
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

export async function releaseRequoteToDriver(
  jobId: string,
  previousPartsCost: number,
): Promise<void> {
  await notifyDriverRequote(jobId, previousPartsCost);
  await scheduleRequoteTimeout(jobId);
}
