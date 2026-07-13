import { z } from "zod";

import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import {
  SetupIntentJobMismatchError,
  SetupIntentNotReadyError,
  completeBookingPayment,
} from "@/lib/bookings/complete-payment";
import {
  SetupIntentMetadataError,
  SetupIntentNotFoundError,
} from "@/lib/payments/errors";
import { paymentCompleteRequestSchema } from "@/types/api/payment";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = paymentCompleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    await verifyJobAccessToken(jobId, parsed.data.token);
  } catch (error) {
    if (error instanceof InvalidJobAccessTokenError) {
      return jsonError(401, "invalid_token", error.message);
    }
    throw error;
  }

  try {
    const result = await completeBookingPayment(
      jobId,
      parsed.data.setupIntentId,
    );
    return jsonOk(result);
  } catch (error) {
    if (error instanceof SetupIntentNotReadyError) {
      return jsonError(409, "setup_not_ready", error.message);
    }
    if (error instanceof SetupIntentJobMismatchError) {
      return jsonError(400, "setup_intent_mismatch", error.message);
    }
    if (error instanceof SetupIntentNotFoundError) {
      return jsonError(404, "setup_intent_not_found", error.message);
    }
    if (error instanceof SetupIntentMetadataError) {
      return jsonError(422, "setup_intent_invalid", error.message);
    }
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", `Job ${jobId} not found.`);
    }
    console.error(`[api/bookings/${jobId}/payment/complete]`, error);
    throw error;
  }
}
