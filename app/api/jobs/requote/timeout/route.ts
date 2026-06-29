import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { AirtableError } from "@/lib/airtable";
import { runRequoteTimeoutCheck } from "@/lib/requotes/timeout-check";
import { verifyQStashSignature } from "@/lib/qstash/verify";
import { requoteTimeoutPayloadSchema } from "@/types/api/service";

async function handler(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = requoteTimeoutPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  const { jobId } = parsed.data;

  try {
    const result = await runRequoteTimeoutCheck(jobId);
    return jsonOk({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonOk({
        ok: true,
        jobId,
        skipped: true,
        reason: "job_not_found",
      });
    }

    console.error(`[api/jobs/requote/timeout] job ${jobId}:`, error);
    throw error;
  }
}

export const POST = verifyQStashSignature(handler);
