import { createPartsFlaggedActionItem } from "@/lib/action-items/create";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { jobRequiresReceipt } from "@/lib/receipts/eligibility";
import { PARTS_PREAPPROVAL_THRESHOLD_DOLLARS } from "@/lib/quotes/constants";
import { releaseQuoteToDriver } from "@/lib/quotes/release";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "./guards";
import { InvalidServiceCommandError } from "./errors";
import { parseQuoteLine } from "./quote-parse";

/**
 * QUOTE $X PARTS $Y [ON_HAND] — parse §7.2 format → `quote_submitted` or
 * `quote_pending_admin` when parts exceed $500 (Exhibit A §3.4).
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

  const receiptFields = jobRequiresReceipt({
    parts_cost: parsed.partsCost,
    on_hand: parsed.onHand,
  })
    ? { receipt_status: "pending" as const }
    : {};

  const financialFields = {
    quote_amount: parsed.quoteAmount,
    parts_cost: parsed.partsCost,
    final_price: parsed.finalPrice,
    mechanic_payout: parsed.mechanicPayout,
    platform_fee: parsed.platformFee,
    on_hand: parsed.onHand,
    ...receiptFields,
  };

  const needsAdminApproval =
    parsed.partsCost > PARTS_PREAPPROVAL_THRESHOLD_DOLLARS;

  if (needsAdminApproval) {
    const updated = await updateJobStatus(jobId, {
      status: "quote_pending_admin",
      ...financialFields,
    });

    await createPartsFlaggedActionItem({
      jobId,
      quoteAmount: parsed.quoteAmount,
      partsCost: parsed.partsCost,
      mechanic: job.fields.mechanic,
      driver: job.fields.driver,
    });

    return {
      jobId,
      status: updated.fields.status,
      action: "quote_pending_admin",
    };
  }

  const updated = await updateJobStatus(jobId, {
    status: "quote_submitted",
    ...financialFields,
  });

  await releaseQuoteToDriver(jobId);

  return {
    jobId,
    status: updated.fields.status,
    action: "quote_submitted",
  };
}
