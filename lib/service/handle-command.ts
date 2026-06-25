import { reportNoShow } from "@/lib/no-show/report";
import type { ParsedSmsCommand } from "@/lib/sms/parse-command";
import { handleArrived } from "./commands/arrived";
import { handleDiagnosing } from "./commands/diagnosing";
import { handleEnRoute } from "./commands/enroute";
import { handleParts } from "./commands/parts";
import { handleReceived } from "./commands/received";
import { handleStarted } from "./commands/started";
import { handleDone } from "./done";
import { handleQuote } from "./quote";
import type { ServiceCommandResult } from "./guards";

export type { ServiceCommandResult };

export type ServiceHandleResult = ServiceCommandResult;

function isServiceParsedCommand(
  parsed: ParsedSmsCommand,
): parsed is Exclude<ParsedSmsCommand, { kind: "match" } | { kind: "unknown" }> {
  return (
    parsed.kind === "post_match" ||
    parsed.kind === "quote" ||
    parsed.kind === "parts" ||
    parsed.kind === "done" ||
    parsed.kind === "noshow"
  );
}

/**
 * Dispatch post-match mechanic SMS commands (ENROUTE … DONE, NOSHOW).
 */
export async function handleServiceCommand(
  jobId: string,
  mechanicId: string,
  parsed: ParsedSmsCommand,
): Promise<ServiceHandleResult> {
  if (!isServiceParsedCommand(parsed)) {
    throw new Error("handleServiceCommand called with non-service command");
  }

  switch (parsed.kind) {
    case "post_match":
      switch (parsed.command) {
        case "ENROUTE":
          return handleEnRoute(jobId, mechanicId);
        case "ARRIVED":
          return handleArrived(jobId, mechanicId);
        case "RECEIVED":
          return handleReceived(jobId, mechanicId);
        case "DIAGNOSING":
          return handleDiagnosing(jobId, mechanicId);
        case "STARTED":
          return handleStarted(jobId, mechanicId);
      }
      break;
    case "quote":
      return handleQuote(jobId, mechanicId, parsed.remainder);
    case "parts":
      return handleParts(jobId, mechanicId, parsed.remainder);
    case "done":
      return handleDone(jobId, mechanicId, parsed.remainder);
    case "noshow":
      return reportNoShow(jobId, mechanicId);
  }
}

export { isServiceParsedCommand };
