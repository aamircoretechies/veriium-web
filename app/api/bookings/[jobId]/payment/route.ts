import { z } from "zod";

import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import {
  DriverNotLinkedError,
  JobNotPayableError,
  PaymentAlreadyCompletedError,
} from "@/lib/payments/errors";
import { createSetupIntentForJob } from "@/lib/payments/setup-intent";
import { paymentSetupRequestSchema } from "@/types/api/payment";

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

  const parsed = paymentSetupRequestSchema.safeParse(body);
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
    const result = await createSetupIntentForJob(jobId);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", `Job ${jobId} not found.`);
    }
    if (error instanceof JobNotPayableError) {
      return jsonError(409, "job_not_payable", error.message);
    }
    if (error instanceof PaymentAlreadyCompletedError) {
      return jsonError(409, "payment_already_completed", error.message);
    }
    if (error instanceof DriverNotLinkedError) {
      return jsonError(422, "driver_not_linked", error.message);
    }

    console.error(`[api/bookings/${jobId}/payment]`, error);
    throw error;
  }
}
