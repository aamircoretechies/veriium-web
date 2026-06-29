import { QuoteParseError } from "./errors";
import { computeServicePayout, type ServicePayoutBreakdown } from "./payout";

export type ParsedQuoteLine = {
  quoteAmount: number;
  partsCost: number;
  onHand: boolean;
  nonOemOrUsedParts: boolean;
  notes?: string;
  nonOemPartsDescription?: string;
} & ServicePayoutBreakdown;

const QUOTE_LINE_RE =
  /^\$?(\d+(?:\.\d{1,2})?)\s+PARTS\s+\$?(\d+(?:\.\d{1,2})?)(?:\s+(?:ON_HAND|USED))*(?:\s+(.+))?$/i;

function stripQuoteTokens(notes: string | undefined): string | undefined {
  if (!notes) {
    return undefined;
  }

  const cleaned = notes
    .replace(/\bON_HAND\b/gi, "")
    .replace(/\bUSED\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}

/**
 * Parse §7.2 quote / done remainder: `$245 PARTS $80 [ON_HAND] [USED] optional notes`.
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
  const nonOemOrUsedParts = /\bUSED\b/i.test(trimmed);
  const rawNotes = match[3]?.trim() || undefined;
  const notes = stripQuoteTokens(rawNotes) ?? rawNotes;
  const nonOemPartsDescription = nonOemOrUsedParts ? notes : undefined;

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
    nonOemOrUsedParts,
    notes,
    nonOemPartsDescription,
    ...payout,
  };
}
