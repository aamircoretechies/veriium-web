import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { isWithinTolerance } from "./tolerance";
import type { JobFields } from "@/types/airtable/jobs";
import { jobRequiresReceipt } from "@/lib/receipts/eligibility";

export type PartsReconcileResult = {
  allowed: boolean;
  finalPartsCost: number;
  variance: number;
  blockReason?: "receipt_total_missing" | "requote_required";
};

export function reconcilePartsAtDone(
  job: Pick<JobFields, "parts_cost" | "quote_parts_on_hand" | "quote_details">,
): PartsReconcileResult {
  const quotedParts = job.parts_cost ?? 0;
  const details = parseQuoteDetails(job.quote_details);

  if (!jobRequiresReceipt(job)) {
    return {
      allowed: true,
      finalPartsCost: quotedParts,
      variance: 0,
    };
  }

  const receiptTotal = details.receipt_total;
  if (receiptTotal === undefined) {
    return {
      allowed: false,
      finalPartsCost: quotedParts,
      variance: 0,
      blockReason: "receipt_total_missing",
    };
  }

  const variance = receiptTotal - quotedParts;

  if (receiptTotal < quotedParts) {
    return {
      allowed: true,
      finalPartsCost: receiptTotal,
      variance,
    };
  }

  if (isWithinTolerance(quotedParts, receiptTotal)) {
    return {
      allowed: true,
      finalPartsCost: receiptTotal,
      variance,
    };
  }

  return {
    allowed: false,
    finalPartsCost: quotedParts,
    variance,
    blockReason: "requote_required",
  };
}
