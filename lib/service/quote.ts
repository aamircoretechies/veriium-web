import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendSms } from "@/lib/twilio/sms";
import { serviceQuoteDriver } from "@/lib/twilio/templates";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "./guards";
import { InvalidServiceCommandError } from "./errors";
import { parseQuoteLine } from "./quote-parse";

async function notifyDriverQuote(
  jobId: string,
  quoteAmount: number,
  partsCost: number,
  onHand: boolean,
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
      serviceQuoteDriver({ quoteAmount, partsCost, onHand }),
    );
  } catch (error) {
    console.error(
      `[service/quote] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

/**
 * QUOTE $X PARTS $Y [ON_HAND] — parse §7.2 format → `quote_submitted`; SMS driver.
 */
export async function handleQuote(
  jobId: string,
  mechanicId: string,
  remainder: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (job.fields.status !== "diagnosing") {
    throw new InvalidServiceCommandError("QUOTE", job.fields.status);
  }

  const parsed = parseQuoteLine(remainder);

  const updated = await updateJobStatus(jobId, {
    status: "quote_submitted",
    quote_amount: parsed.quoteAmount,
    parts_cost: parsed.partsCost,
    final_price: parsed.finalPrice,
    mechanic_payout: parsed.mechanicPayout,
    platform_fee: parsed.platformFee,
    on_hand: parsed.onHand,
  });

  await notifyDriverQuote(
    jobId,
    parsed.quoteAmount,
    parsed.partsCost,
    parsed.onHand,
  );

  return {
    jobId,
    status: updated.fields.status,
    action: "quote_submitted",
  };
}
