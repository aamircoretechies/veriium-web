import { z } from "zod";

/** Auxiliary job state stored in Jobs.quote_details (multilineText JSON). */
export const quoteDetailsSchema = z.object({
  quote_timeout_qstash_id: z.string().optional(),
  requote_timeout_qstash_id: z.string().optional(),
  payment_retry_qstash_id: z.string().optional(),
  non_oem_or_used_parts: z.boolean().optional(),
  non_oem_parts_description: z.string().optional(),
  non_oem_consent_at: z.string().optional(),
  original_parts_cost: z.number().optional(),
  requote_reason: z.string().optional(),
  parts_variance: z.number().optional(),
  payout_held: z.boolean().optional(),
  receipt_status: z
    .enum(["pending", "submitted", "overdue", "invalid"])
    .optional(),
  receipt_total: z.number().optional(),
  parts_reimbursement_forfeited: z.boolean().optional(),
  requote: z.boolean().optional(),
  recovery: z.boolean().optional(),
  arrived_at: z.string().optional(),
  in_progress_at: z.string().optional(),
  requote_approved_at: z.string().optional(),
  requote_declined_at: z.string().optional(),
});

export type QuoteDetails = z.infer<typeof quoteDetailsSchema>;

export function parseQuoteDetails(raw: string | undefined): QuoteDetails {
  if (!raw?.trim()) {
    return {};
  }
  try {
    return quoteDetailsSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function stringifyQuoteDetails(details: QuoteDetails): string {
  return JSON.stringify(details);
}

export function mergeQuoteDetails(
  raw: string | undefined,
  patch: QuoteDetails,
): string {
  const current = parseQuoteDetails(raw);
  return stringifyQuoteDetails({ ...current, ...patch });
}
