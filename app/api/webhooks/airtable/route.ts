import { z } from "zod";
import { getEnv } from "@/config/env";
import { jsonError, jsonOk } from "@/lib/api/response";
import { handleMechanicStatusChange } from "@/lib/mechanics/status-webhook";
import { airtableWebhookSchema } from "@/types/api/airtable-webhook";

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

  const parsed = airtableWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  await handleMechanicStatusChange(parsed.data);

  return jsonOk({ ok: true });
}
