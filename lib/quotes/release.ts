import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { jobRequiresReceipt } from "@/lib/receipts/eligibility";
import { scheduleReceiptDeadlineCheck } from "@/lib/receipts/schedule";
import { sendSms } from "@/lib/twilio/sms";
import { serviceQuoteDriver } from "@/lib/twilio/templates";
import { scheduleQuoteTimeout } from "./schedule";

async function notifyDriverQuote(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return;
  }

  const quoteAmount = job.fields.quote_total ?? 0;
  const partsCost = job.fields.parts_cost ?? 0;
  const onHand = job.fields.quote_parts_on_hand ?? false;
  const details = parseQuoteDetails(job.fields.quote_details);
  const nonOemOrUsedParts = details.non_oem_or_used_parts ?? false;
  const nonOemPartsDescription = details.non_oem_parts_description;

  try {
    const driver = await getDriverById(driverId);
    await sendSms(
      driver.fields.phone_number,
      serviceQuoteDriver({
        quoteAmount,
        partsCost,
        onHand,
        nonOemOrUsedParts,
        nonOemPartsDescription,
      }),
    );
  } catch (error) {
    console.error(
      `[quotes/release] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

export async function releaseQuoteToDriver(jobId: string): Promise<void> {
  const job = await getJobById(jobId);

  if (jobRequiresReceipt(job.fields)) {
    await scheduleReceiptDeadlineCheck(jobId);
  }

  await notifyDriverQuote(jobId);
  await scheduleQuoteTimeout(jobId);
}
