import { QuoteParseError } from "./errors";

export type ParsedRequoteLine = {
  partsCost: number;
  reason?: string;
};

const REQUOTE_LINE_RE =
  /^PARTS\s+\$?(\d+(?:\.\d{1,2})?)(?:\s+(.+))?$/i;

/**
 * Parse §3.2 requote remainder: `PARTS $YY [reason]`.
 */
export function parseRequoteLine(remainder: string): ParsedRequoteLine {
  const trimmed = remainder.trim();
  const match = trimmed.match(REQUOTE_LINE_RE);

  if (!match) {
    throw new QuoteParseError(remainder);
  }

  const partsCost = Number.parseFloat(match[1]!);
  const reason = match[2]?.trim() || undefined;

  if (!Number.isFinite(partsCost) || partsCost < 0) {
    throw new QuoteParseError(remainder);
  }

  return { partsCost, reason };
}
