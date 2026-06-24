import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { AirtableError } from "@/lib/airtable";
import { escalateToTier } from "@/lib/matching/escalate";
import { verifyQStashSignature } from "@/lib/qstash/verify";
import { matchEscalatePayloadSchema } from "@/types/api/matching";

async function handler(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = matchEscalatePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  const { jobId, tier } = parsed.data;

  try {
    await escalateToTier(jobId, tier);
    return jsonOk({ ok: true, jobId, tier });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonOk({
        ok: true,
        jobId,
        tier,
        skipped: true,
        reason: "job_not_found",
      });
    }

    console.error(
      `[api/jobs/match/escalate] tier ${tier} for ${jobId}:`,
      error,
    );
    throw error;
  }
}

export const POST = verifyQStashSignature(handler);
