import { QuoteParseError } from "./errors";
import { computeServicePayout, type ServicePayoutBreakdown } from "./payout";

export type ParsedQuoteLine = {
  quoteAmount: number;
  partsCost: number;
  onHand: boolean;
  notes?: string;
} & ServicePayoutBreakdown;

const QUOTE_LINE_RE =
  /^\$?(\d+(?:\.\d{1,2})?)\s+PARTS\s+\$?(\d+(?:\.\d{1,2})?)(?:\s+ON_HAND)?(?:\s+(.+))?$/i;

/**
 * Parse §7.2 quote / done remainder: `$245 PARTS $80 [ON_HAND] optional notes`.
 */
export function parseQuoteLine(remainder: string): ParsedQuoteLine {
  const trimmed = remainder.trim();
  const match = trimmed.match(QUOTE_LINE_RE);

  if (!match) {
    throw new QuoteParseError(remainder);
  }

  const quoteAmount = Number.parseFloat(match[1]!);
  const partsCost = Number.parseFloat(match[2]!);
  const onHand = /\bON_HAND\b/i.test(trimmed);
  const notes = match[3]?.trim() || undefined;

  if (
    !Number.isFinite(quoteAmount) ||
    quoteAmount < 0 ||
    !Number.isFinite(partsCost) ||
    partsCost < 0
  ) {
    throw new QuoteParseError(remainder);
  }

  const payout = computeServicePayout(quoteAmount, partsCost);

  return {
    quoteAmount,
    partsCost,
    onHand,
    notes,
    ...payout,
  };
}
