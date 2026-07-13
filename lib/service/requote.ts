import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails, parseQuoteDetails } from "@/lib/jobs/quote-details";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { updateJobStatus } from "@/lib/jobs/update";
import { releaseRequoteToDriver } from "@/lib/requotes/release";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "./guards";
import { InvalidServiceCommandError } from "./errors";
import { computeServicePayout } from "./payout";
import { parseRequoteLine } from "./requote-parse";

function isRequoteEligibleStatus(
  status: string | undefined,
  quoteDetailsRaw: string | undefined,
): boolean {
  if (status === JOB_STATUS.in_progress) {
    return true;
  }
  if (status === JOB_STATUS.awaiting_customer_approval) {
    const receiptStatus = parseQuoteDetails(quoteDetailsRaw).receipt_status;
    return receiptStatus !== "submitted";
  }
  return false;
}

export async function handleRequote(
  jobId: string,
  mechanicId: string,
  remainder: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (
    !isRequoteEligibleStatus(job.fields.status, job.fields.quote_details)
  ) {
    throw new InvalidServiceCommandError("REQUOTE", jobStatusOr(job.fields.status));
  }

  const quoteAmount = job.fields.quote_total;
  if (quoteAmount === undefined) {
    throw new InvalidServiceCommandError("REQUOTE", jobStatusOr(job.fields.status));
  }

  const parsed = parseRequoteLine(remainder);
  const payout = computeServicePayout(quoteAmount, parsed.partsCost);
  const previousPartsCost = job.fields.parts_cost ?? 0;

  const updated = await updateJobStatus(jobId, {
    status: JOB_STATUS.awaiting_customer_approval,
    parts_cost: parsed.partsCost,
    final_price: payout.finalPrice,
    mechanic_payout: payout.mechanicPayout,
    platform_fee: payout.platformFee,
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      requote: true,
      requote_reason: parsed.reason,
    }),
  });

  await releaseRequoteToDriver(jobId, previousPartsCost);

  return {
    jobId,
    status: updated.fields.status ?? "",
    action: "requote_submitted",
  };
}
