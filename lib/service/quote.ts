import { createPartsFlaggedActionItem } from "@/lib/action-items/create";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails } from "@/lib/jobs/quote-details";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
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

export async function handleQuote(
  jobId: string,
  mechanicId: string,
  remainder: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (job.fields.status !== JOB_STATUS.diagnosing) {
    throw new InvalidServiceCommandError("QUOTE", jobStatusOr(job.fields.status));
  }

  const parsed = parseQuoteLine(remainder);

  const quoteDetailsPatch = {
    ...(parsed.nonOemOrUsedParts
      ? { non_oem_or_used_parts: parsed.nonOemOrUsedParts }
      : {}),
    ...(parsed.nonOemPartsDescription
      ? { non_oem_parts_description: parsed.nonOemPartsDescription }
      : {}),
    ...(jobRequiresReceipt({
      parts_cost: parsed.partsCost,
      quote_parts_on_hand: parsed.onHand,
    })
      ? { receipt_status: "pending" as const }
      : {}),
  };

  const financialFields = {
    quote_total: parsed.quoteAmount,
    parts_cost: parsed.partsCost,
    final_price: parsed.finalPrice,
    mechanic_payout: parsed.mechanicPayout,
    platform_fee: parsed.platformFee,
    quote_parts_on_hand: parsed.onHand,
    quote_details: mergeQuoteDetails(job.fields.quote_details, quoteDetailsPatch),
  };

  const needsAdminApproval =
    parsed.partsCost > PARTS_PREAPPROVAL_THRESHOLD_DOLLARS;

  if (needsAdminApproval) {
    const updated = await updateJobStatus(jobId, {
      status: JOB_STATUS.quote_provided,
      parts_cost_flagged: true,
      ...financialFields,
    });

    await createPartsFlaggedActionItem({
      jobId,
      quoteAmount: parsed.quoteAmount,
      partsCost: parsed.partsCost,
      mechanic: job.fields.mechanic_id,
      driver: job.fields.driver_id,
    });

    return {
      jobId,
      status: updated.fields.status ?? "",
      action: "quote_pending_admin",
    };
  }

  const updated = await updateJobStatus(jobId, {
    status: JOB_STATUS.quote_provided,
    parts_cost_flagged: false,
    ...financialFields,
  });

  await releaseQuoteToDriver(jobId);

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "quote_submitted",
  };
}
