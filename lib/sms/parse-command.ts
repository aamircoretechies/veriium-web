/** Matching-phase mechanic replies (§6.1). */
export type MatchSmsCommand = "ACCEPT" | "DECLINE" | "YES" | "NO";

/** Post-matching mechanic commands — parsed but not handled in Phase 4. */
export type PostMatchSmsCommand =
  | "ENROUTE"
  | "ARRIVED"
  | "RECEIVED"
  | "DIAGNOSING"
  | "STARTED";

/** Driver quote approval replies (§7.2). */
export type DriverQuoteSmsCommand = "APPROVE" | "DECLINE";

/** Driver post-completion replies — `2` confirm, `1` dispute (§9.3). */
export type DriverConfirmSmsCommand = "CONFIRM" | "DISPUTE";

type ExactSmsCommand = MatchSmsCommand | PostMatchSmsCommand | "NOSHOW";

export type ParsedSmsCommand =
  | { kind: "match"; command: MatchSmsCommand }
  | { kind: "post_match"; command: PostMatchSmsCommand }
  | { kind: "driver_quote"; command: DriverQuoteSmsCommand }
  | { kind: "driver_confirm"; command: DriverConfirmSmsCommand }
  | { kind: "quote"; remainder: string }
  | { kind: "requote"; remainder: string }
  | { kind: "parts"; remainder: string }
  | { kind: "done"; remainder: string }
  | { kind: "noshow" }
  | { kind: "unknown"; body: string };

const EXACT_COMMANDS: Record<string, ExactSmsCommand> = {
  ACCEPT: "ACCEPT",
  DECLINE: "DECLINE",
  YES: "YES",
  NO: "NO",
  ENROUTE: "ENROUTE",
  ARRIVED: "ARRIVED",
  RECEIVED: "RECEIVED",
  DIAGNOSING: "DIAGNOSING",
  STARTED: "STARTED",
  NOSHOW: "NOSHOW",
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

  if (trimmed === "1") {
    return { kind: "driver_confirm", command: "DISPUTE" };
  }

  if (trimmed === "2") {
    return { kind: "driver_confirm", command: "CONFIRM" };
  }

  const upper = trimmed.toUpperCase();

  if (upper === "APPROVE") {
    return { kind: "driver_quote", command: "APPROVE" };
  }

  const exact = EXACT_COMMANDS[upper];
  if (exact) {
    if (exact === "NOSHOW") {
      return { kind: "noshow" };
    }
    if (MATCH_COMMANDS.has(exact as MatchSmsCommand)) {
      return { kind: "match", command: exact as MatchSmsCommand };
    }
    return { kind: "post_match", command: exact as PostMatchSmsCommand };
  }

  const quoteMatch = trimmed.match(/^quote\s+(.+)$/i);
  if (quoteMatch) {
    return { kind: "quote", remainder: quoteMatch[1].trim() };
  }

  const requoteMatch = trimmed.match(/^requote\s+(.+)$/i);
  if (requoteMatch) {
    return { kind: "requote", remainder: requoteMatch[1].trim() };
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
