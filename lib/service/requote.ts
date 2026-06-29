import { getJobById } from "@/lib/jobs/lookup";
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
  status: string,
  receiptStatus: string | undefined,
): boolean {
  if (status === "in_progress") {
    return true;
  }
  if (status === "quote_approved") {
    return receiptStatus !== "submitted";
  }
  return false;
}

/**
 * REQUOTE PARTS $YY reason — revised parts quote while in progress (§3.2, §5.5).
 */
export async function handleRequote(
  jobId: string,
  mechanicId: string,
  remainder: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (
    !isRequoteEligibleStatus(job.fields.status, job.fields.receipt_status)
  ) {
    throw new InvalidServiceCommandError("REQUOTE", job.fields.status);
  }

  const quoteAmount = job.fields.quote_amount;
  if (quoteAmount === undefined) {
    throw new InvalidServiceCommandError("REQUOTE", job.fields.status);
  }

  const parsed = parseRequoteLine(remainder);
  const payout = computeServicePayout(quoteAmount, parsed.partsCost);
  const previousPartsCost = job.fields.parts_cost ?? 0;

  const updated = await updateJobStatus(jobId, {
    status: "requote_submitted",
    parts_cost: parsed.partsCost,
    final_price: payout.finalPrice,
    mechanic_payout: payout.mechanicPayout,
    platform_fee: payout.platformFee,
    requote_reason: parsed.reason,
  });

  await releaseRequoteToDriver(jobId, previousPartsCost);

  return {
    jobId,
    status: updated.fields.status,
    action: "requote_submitted",
  };
}
