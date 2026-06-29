import { isWithinTolerance } from "./tolerance";
import type { JobFields } from "@/types/airtable/jobs";
import { jobRequiresReceipt } from "@/lib/receipts/eligibility";

export type PartsReconcileResult = {
  allowed: boolean;
  finalPartsCost: number;
  variance: number;
  blockReason?: "receipt_total_missing" | "requote_required";
};

/**
 * Reconcile quoted parts vs receipt total at DONE (Exhibit A §5.5).
 */
export function reconcilePartsAtDone(
  job: Pick<
    JobFields,
    "parts_cost" | "receipt_total" | "on_hand"
  >,
): PartsReconcileResult {
  const quotedParts = job.parts_cost ?? 0;

  if (!jobRequiresReceipt(job)) {
    return {
      allowed: true,
      finalPartsCost: quotedParts,
      variance: 0,
    };
  }

  const receiptTotal = job.receipt_total;
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
