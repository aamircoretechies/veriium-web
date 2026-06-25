import { z } from "zod";

import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import {
  JobNotCancellableError,
  cancelJob,
} from "@/lib/cancellation/cancel-job";
import { InvalidJobTransitionError } from "@/lib/jobs/transitions";
import { cancelJobRequestSchema } from "@/types/api/cancellation";

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

  const parsed = cancelJobRequestSchema.safeParse(body);
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
    const result = await cancelJob(jobId);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", `Job ${jobId} not found.`);
    }
    if (error instanceof JobNotCancellableError) {
      return jsonError(409, "job_not_cancellable", error.message);
    }
    if (error instanceof InvalidJobTransitionError) {
      return jsonError(409, "invalid_transition", error.message);
    }

    console.error(`[api/jobs/${jobId}/cancel]`, error);
    throw error;
  }
}
