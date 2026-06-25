import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { AirtableError } from "@/lib/airtable";
import { runStaleAvailabilityCheck } from "@/lib/mechanics/stale-check";
import { verifyQStashSignature } from "@/lib/qstash/verify";
import { staleAvailabilityPayloadSchema } from "@/types/api/service";

async function handler(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = staleAvailabilityPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  const { mechanicId } = parsed.data;

  try {
    const result = await runStaleAvailabilityCheck(mechanicId);
    return jsonOk({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonOk({
        ok: true,
        mechanicId,
        skipped: true,
        reason: "mechanic_not_found",
      });
    }

    console.error(
      `[api/mechanics/availability/stale] mechanic ${mechanicId}:`,
      error,
    );
    throw error;
  }
}

export const POST = verifyQStashSignature(handler);
