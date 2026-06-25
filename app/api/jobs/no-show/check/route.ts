import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { AirtableError } from "@/lib/airtable";
import { runNoShowCheck } from "@/lib/no-show/check";
import { verifyQStashSignature } from "@/lib/qstash/verify";
import { noShowCheckPayloadSchema } from "@/types/api/service";

async function handler(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = noShowCheckPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  const { jobId } = parsed.data;

  try {
    const result = await runNoShowCheck(jobId);
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

    console.error(`[api/jobs/no-show/check] job ${jobId}:`, error);
    throw error;
  }
}

export const POST = verifyQStashSignature(handler);
