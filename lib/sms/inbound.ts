import { InvalidDriverConfirmError } from "@/lib/disputes/confirm";
import { InvalidDriverDisputeError } from "@/lib/disputes/dispute";
import {
  findActiveJobForMechanic,
  findJobAwaitingDriverResponse,
  findPendingJobForMechanic,
} from "@/lib/jobs/lookup";
import { InvalidDriverQuoteResponseError } from "@/lib/service/quote-response";
import { InvalidDriverRequoteResponseError } from "@/lib/service/requote-response";
import { InvalidPartsConsentError } from "@/lib/parts/consent";
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
import { handleReceiptMms } from "@/lib/receipts/mms";
import {
  ReceiptAlreadySubmittedError,
  ReceiptNotEligibleError,
} from "@/lib/receipts/errors";
import {
  handleServiceCommand,
  isServiceParsedCommand,
} from "@/lib/service/handle-command";
import {
  InvalidServiceCommandError,
  NoShowNotEligibleError,
  QuoteParseError,
  WrongServiceTypeError,
} from "@/lib/service/errors";
import {
  handleDriverInbound,
  isDriverResponseCommand,
} from "./driver-inbound";
import { parseSmsCommand, type ParsedSmsCommand } from "./parse-command";

export type InboundSmsFields = {
  From: string;
  Body: string;
  MessageSid: string;
  NumMedia?: number;
  MediaUrl0?: string;
  MediaContentType0?: string;
};

export type HandleInboundSmsResult = {
  messageSid: string;
  from: string;
  parsed: ParsedSmsCommand;
  action:
    | "ignored"
    | "match_handled"
    | "service_handled"
    | "driver_handled"
    | "unknown"
    | "no_mechanic"
    | "no_pending_job"
    | "no_active_job"
    | "receipt_mms_handled"
    | "receipt_mms_no_mechanic"
    | "receipt_mms_no_active_job"
    | "receipt_mms_not_required"
    | "receipt_mms_download_failed"
    | "receipt_mms_error";
  matchAction?: string;
  serviceAction?: string;
  driverAction?: string;
  receiptJobId?: string;
};

function isMatchCommand(
  parsed: ParsedSmsCommand,
): parsed is { kind: "match"; command: MatchResponseCommand } {
  return parsed.kind === "match";
}

/**
 * Dispatch inbound SMS: driver responses, service handlers, then matching.
 */
export async function handleInboundSms(
  fields: InboundSmsFields,
): Promise<HandleInboundSmsResult> {
  const parsed = parseSmsCommand(fields.Body ?? "");
  const base = {
    messageSid: fields.MessageSid,
    from: fields.From,
    parsed,
  };

  if ((fields.NumMedia ?? 0) > 0 && fields.MediaUrl0) {
    try {
      const mmsResult = await handleReceiptMms({
        from: fields.From,
        mediaUrl: fields.MediaUrl0,
        mediaContentType: fields.MediaContentType0,
      });

      if (mmsResult.action === "receipt_mms_handled") {
        console.log(
          `[sms/inbound] Receipt MMS for job ${mmsResult.jobId} (${fields.MessageSid})`,
        );
        return {
          ...base,
          action: "receipt_mms_handled",
          receiptJobId: mmsResult.jobId,
        };
      }

      console.log(
        `[sms/inbound] Receipt MMS not applied (${mmsResult.action}, ${fields.MessageSid})`,
      );
      return { ...base, action: mmsResult.action };
    } catch (error) {
      if (
        error instanceof ReceiptAlreadySubmittedError ||
        error instanceof ReceiptNotEligibleError
      ) {
        console.warn(
          `[sms/inbound] Ignored receipt MMS (${fields.MessageSid}):`,
          error.message,
        );
        return { ...base, action: "ignored" };
      }
      console.error(`[sms/inbound] Receipt MMS error (${fields.MessageSid}):`, error);
      return { ...base, action: "receipt_mms_error" };
    }
  }

  if (parsed.kind === "unknown") {
    console.log(
      `[sms/inbound] Unknown command from ${fields.From} (${fields.MessageSid}): ${parsed.body}`,
    );
    return { ...base, action: "unknown" };
  }

  const phoneE164 = normalizeUsPhone(fields.From);

  const driverJob = await findJobAwaitingDriverResponse(phoneE164);
  if (driverJob && isDriverResponseCommand(parsed, driverJob)) {
    try {
      const result = await handleDriverInbound(driverJob, parsed);
      console.log(
        `[sms/inbound] Driver response for job ${driverJob.id}:`,
        result.action,
        `(${fields.MessageSid})`,
      );
      return {
        ...base,
        action: "driver_handled",
        driverAction: result.action,
      };
    } catch (error) {
      if (
        error instanceof InvalidDriverQuoteResponseError ||
        error instanceof InvalidDriverRequoteResponseError ||
        error instanceof InvalidDriverConfirmError ||
        error instanceof InvalidDriverDisputeError ||
        error instanceof InvalidPartsConsentError
      ) {
        console.warn(
          `[sms/inbound] Ignored driver response for job ${driverJob.id}:`,
          error.message,
        );
        return { ...base, action: "ignored" };
      }
      throw error;
    }
  }

  if (isServiceParsedCommand(parsed)) {
    const mechanic = await findMechanicByPhone(phoneE164);
    if (!mechanic) {
      console.warn(
        `[sms/inbound] Service command from unknown mechanic phone ${phoneE164} (${fields.MessageSid})`,
      );
      return { ...base, action: "no_mechanic" };
    }

    const job = await findActiveJobForMechanic(phoneE164);
    if (!job) {
      console.log(
        `[sms/inbound] No active service job for mechanic ${mechanic.id} (${fields.MessageSid})`,
      );
      return { ...base, action: "no_active_job" };
    }

    try {
      const result = await handleServiceCommand(
        job.id,
        mechanic.id,
        parsed,
      );
      console.log(
        `[sms/inbound] Service command for job ${job.id}:`,
        result.action,
        `(${fields.MessageSid})`,
      );
      return {
        ...base,
        action: "service_handled",
        serviceAction: result.action,
      };
    } catch (error) {
      if (
        error instanceof InvalidServiceCommandError ||
        error instanceof WrongServiceTypeError ||
        error instanceof QuoteParseError ||
        error instanceof NoShowNotEligibleError ||
        error instanceof MechanicNotAssignedError
      ) {
        console.warn(
          `[sms/inbound] Ignored service command for job ${job.id}:`,
          error.message,
        );
        return { ...base, action: "ignored" };
      }
      throw error;
    }
  }

  if (!isMatchCommand(parsed)) {
    return { ...base, action: "unknown" };
  }

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
