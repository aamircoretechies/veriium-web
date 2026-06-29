import { confirmJob } from "@/lib/disputes/confirm";
import { disputeJob } from "@/lib/disputes/dispute";
import { grantPartsConsent } from "@/lib/parts/consent";
import {
  approveQuote,
  declineQuote,
} from "@/lib/service/quote-response";
import {
  approveRequote,
  declineRequote,
} from "@/lib/service/requote-response";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import type { ParsedSmsCommand } from "./parse-command";

export type DriverInboundResult = {
  jobId: string;
  status: string;
  action: string;
};

export function isDriverResponseCommand(
  parsed: ParsedSmsCommand,
  job: AirtableRecord<JobFields>,
): boolean {
  if (parsed.kind === "driver_quote") {
    return (
      job.fields.status === "quote_submitted" ||
      job.fields.status === "requote_submitted"
    );
  }

  if (parsed.kind === "driver_confirm") {
    return job.fields.status === "completed_pending_confirmation";
  }

  if (parsed.kind === "match" && parsed.command === "DECLINE") {
    return (
      job.fields.status === "quote_submitted" ||
      job.fields.status === "requote_submitted"
    );
  }

  if (parsed.kind === "match" && parsed.command === "YES") {
    return job.fields.status === "awaiting_parts_consent";
  }

  return false;
}

/**
 * Handle driver SMS replies: quote/requote APPROVE/DECLINE and confirm/dispute digits (§7.2, §9.3).
 */
export async function handleDriverInbound(
  job: AirtableRecord<JobFields>,
  parsed: ParsedSmsCommand,
): Promise<DriverInboundResult> {
  if (parsed.kind === "driver_quote") {
    if (job.fields.status === "requote_submitted") {
      if (parsed.command === "APPROVE") {
        return approveRequote(job.id);
      }
      return declineRequote(job.id);
    }

    if (parsed.command === "APPROVE") {
      return approveQuote(job.id);
    }
    return declineQuote(job.id);
  }

  if (parsed.kind === "driver_confirm") {
    if (parsed.command === "CONFIRM") {
      return confirmJob(job.id);
    }
    return disputeJob(job.id);
  }

  if (parsed.kind === "match" && parsed.command === "DECLINE") {
    if (job.fields.status === "requote_submitted") {
      return declineRequote(job.id);
    }
    return declineQuote(job.id);
  }

  if (parsed.kind === "match" && parsed.command === "YES") {
    return grantPartsConsent(job.id);
  }

  throw new Error("handleDriverInbound called with non-driver command");
}
