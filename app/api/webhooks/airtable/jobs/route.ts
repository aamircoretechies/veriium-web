import { z } from "zod";

import { getEnv } from "@/config/env";
import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import { InvalidDriverConfirmError, confirmJob } from "@/lib/disputes/confirm";
import { InvalidJobRefundError, refundJob } from "@/lib/disputes/refund";
import {
  InvalidNoShowApprovalError,
  approveNoShow,
} from "@/lib/no-show/approve";
import {
  InvalidQuotePartsApprovalError,
  approveQuoteParts,
} from "@/lib/quotes/approve-parts";
import { airtableJobWebhookSchema } from "@/types/api/airtable-job-webhook";

const WEBHOOK_SECRET_HEADER = "x-airtable-webhook-secret";

export async function POST(request: Request) {
  const env = getEnv();
  const secret = request.headers.get(WEBHOOK_SECRET_HEADER);

  if (!secret || secret !== env.AIRTABLE_WEBHOOK_SECRET) {
    return jsonError(401, "unauthorized", "Invalid webhook secret.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = airtableJobWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  const { recordId, action } = parsed.data;

  try {
    const result =
      action === "no_show_approved"
        ? await approveNoShow(recordId)
        : action === "dispute_refund"
          ? await refundJob(recordId)
          : action === "quote_parts_approved"
            ? await approveQuoteParts(recordId)
            : await confirmJob(recordId);

    return jsonOk(result);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", `Job ${recordId} not found.`);
    }
    if (
      error instanceof InvalidNoShowApprovalError ||
      error instanceof InvalidJobRefundError ||
      error instanceof InvalidDriverConfirmError ||
      error instanceof InvalidQuotePartsApprovalError
    ) {
      return jsonError(409, "invalid_job_state", error.message);
    }

    console.error("[api/webhooks/airtable/jobs]", error);
    throw error;
  }
}
