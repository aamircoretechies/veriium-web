/** Matching-phase mechanic replies (§6.1). */
export type MatchSmsCommand = "ACCEPT" | "DECLINE" | "YES" | "NO";

/** Post-matching mechanic commands — parsed but not handled in Phase 4. */
export type PostMatchSmsCommand =
  | "ENROUTE"
  | "ARRIVED"
  | "RECEIVED"
  | "DIAGNOSING"
  | "STARTED";

export type ParsedSmsCommand =
  | { kind: "match"; command: MatchSmsCommand }
  | { kind: "post_match"; command: PostMatchSmsCommand }
  | { kind: "quote"; remainder: string }
  | { kind: "parts"; remainder: string }
  | { kind: "done"; remainder: string }
  | { kind: "unknown"; body: string };

const EXACT_COMMANDS: Record<string, MatchSmsCommand | PostMatchSmsCommand> = {
  ACCEPT: "ACCEPT",
  DECLINE: "DECLINE",
  YES: "YES",
  NO: "NO",
  ENROUTE: "ENROUTE",
  ARRIVED: "ARRIVED",
  RECEIVED: "RECEIVED",
  DIAGNOSING: "DIAGNOSING",
  STARTED: "STARTED",
};

const MATCH_COMMANDS = new Set<MatchSmsCommand>([
  "ACCEPT",
  "DECLINE",
  "YES",
  "NO",
]);

/**
 * Parse §6.1 inbound SMS commands (case-insensitive).
 * Unknown bodies return `{ kind: "unknown" }`.
 */
export function parseSmsCommand(body: string): ParsedSmsCommand {
  const trimmed = body.trim();
  if (!trimmed) {
    return { kind: "unknown", body };
  }

  const upper = trimmed.toUpperCase();
  const exact = EXACT_COMMANDS[upper];
  if (exact) {
    if (MATCH_COMMANDS.has(exact as MatchSmsCommand)) {
      return { kind: "match", command: exact as MatchSmsCommand };
    }
    return { kind: "post_match", command: exact as PostMatchSmsCommand };
  }

  const quoteMatch = trimmed.match(/^quote\s+(.+)$/i);
  if (quoteMatch) {
    return { kind: "quote", remainder: quoteMatch[1].trim() };
  }

  const partsMatch = trimmed.match(/^parts\s+(.+)$/i);
  if (partsMatch) {
    return { kind: "parts", remainder: partsMatch[1].trim() };
  }

  const doneMatch = trimmed.match(/^done\s+(.+)$/i);
  if (doneMatch) {
    return { kind: "done", remainder: doneMatch[1].trim() };
  }

  return { kind: "unknown", body: trimmed };
}
