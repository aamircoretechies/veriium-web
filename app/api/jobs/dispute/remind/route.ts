import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { AirtableError } from "@/lib/airtable";
import { runDisputeRemind } from "@/lib/disputes/remind";
import { verifyQStashSignature } from "@/lib/qstash/verify";
import { disputeRemindPayloadSchema } from "@/types/api/service";

async function handler(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = disputeRemindPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  const { jobId, reminder } = parsed.data;

  try {
    const result = await runDisputeRemind(jobId, reminder);
    return jsonOk({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonOk({
        ok: true,
        jobId,
        reminder,
        skipped: true,
        reason: "job_not_found",
      });
    }

    console.error(
      `[api/jobs/dispute/remind] ${reminder}h for job ${jobId}:`,
      error,
    );
    throw error;
  }
}

export const POST = verifyQStashSignature(handler);
