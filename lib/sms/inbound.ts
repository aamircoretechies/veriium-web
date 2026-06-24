import { findPendingJobForMechanic } from "@/lib/jobs/lookup";
import {
  InvalidMatchResponseError,
  MechanicNotAssignedError,
} from "@/lib/matching/errors";
import {
  handleMatchResponse,
  type MatchResponseCommand,
} from "@/lib/matching/respond";
import { findMechanicByPhone } from "@/lib/mechanics/lookup";
import { normalizeUsPhone } from "@/lib/phone";
import { sendSms } from "@/lib/twilio/sms";
import { parseSmsCommand, type ParsedSmsCommand } from "./parse-command";

const COMMAND_NOT_AVAILABLE_YET =
  "Veriium: That command is not available yet. We'll text you when it's time for the next step.";

export type InboundSmsFields = {
  From: string;
  Body: string;
  MessageSid: string;
};

export type HandleInboundSmsResult = {
  messageSid: string;
  from: string;
  parsed: ParsedSmsCommand;
  action:
    | "ignored"
    | "match_handled"
    | "post_match_deferred"
    | "unknown"
    | "no_mechanic"
    | "no_pending_job";
  matchAction?: string;
};

function isMatchCommand(
  parsed: ParsedSmsCommand,
): parsed is { kind: "match"; command: MatchResponseCommand } {
  return parsed.kind === "match";
}

async function notifyCommandNotAvailable(phoneE164: string): Promise<void> {
  try {
    await sendSms(phoneE164, COMMAND_NOT_AVAILABLE_YET);
  } catch (error) {
    console.error(
      `[sms/inbound] Failed to send deferred-command reply to ${phoneE164}:`,
      error,
    );
  }
}

/**
 * Dispatch an inbound mechanic SMS: matching handlers in Phase 4; later commands log + optional reply.
 */
export async function handleInboundSms(
  fields: InboundSmsFields,
): Promise<HandleInboundSmsResult> {
  const parsed = parseSmsCommand(fields.Body);
  const base = {
    messageSid: fields.MessageSid,
    from: fields.From,
    parsed,
  };

  if (parsed.kind === "unknown") {
    console.log(
      `[sms/inbound] Unknown command from ${fields.From} (${fields.MessageSid}): ${parsed.body}`,
    );
    return { ...base, action: "unknown" };
  }

  if (
    parsed.kind === "post_match" ||
    parsed.kind === "quote" ||
    parsed.kind === "parts" ||
    parsed.kind === "done"
  ) {
    console.log(
      `[sms/inbound] Deferred command from ${fields.From} (${fields.MessageSid}):`,
      parsed,
    );
    const phoneE164 = normalizeUsPhone(fields.From);
    await notifyCommandNotAvailable(phoneE164);
    return { ...base, action: "post_match_deferred" };
  }

  if (!isMatchCommand(parsed)) {
    return { ...base, action: "unknown" };
  }

  const phoneE164 = normalizeUsPhone(fields.From);
  const mechanic = await findMechanicByPhone(phoneE164);
  if (!mechanic) {
    console.warn(
      `[sms/inbound] Match command from unknown mechanic phone ${phoneE164} (${fields.MessageSid})`,
    );
    return { ...base, action: "no_mechanic" };
  }

  const job = await findPendingJobForMechanic(phoneE164);
  if (!job) {
    console.log(
      `[sms/inbound] No pending job for mechanic ${mechanic.id} (${parsed.command}, ${fields.MessageSid})`,
    );
    return { ...base, action: "no_pending_job" };
  }

  try {
    const result = await handleMatchResponse(
      job.id,
      mechanic.id,
      parsed.command,
    );
    console.log(
      `[sms/inbound] Match response for job ${job.id}:`,
      result.action,
      `(${fields.MessageSid})`,
    );
    return {
      ...base,
      action: "match_handled",
      matchAction: result.action,
    };
  } catch (error) {
    if (
      error instanceof InvalidMatchResponseError ||
      error instanceof MechanicNotAssignedError
    ) {
      console.warn(
        `[sms/inbound] Ignored ${parsed.command} for job ${job.id}:`,
        error.message,
      );
      return { ...base, action: "ignored" };
    }
    throw error;
  }
}
