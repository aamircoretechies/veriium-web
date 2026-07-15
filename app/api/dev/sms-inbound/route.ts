import { z } from "zod";
import { getEnv } from "@/config/env";
import { jsonError, jsonOk } from "@/lib/api/response";
import { isDevBypassMode } from "@/lib/dev/flags";
import { handleInboundSms } from "@/lib/sms/inbound";
import { normalizeUsPhone, InvalidPhoneError } from "@/lib/phone";
import { devSmsInboundSchema } from "@/types/api/dev-sms-inbound";

const DEV_SECRET_HEADER = "x-matching-dev-secret";

/**
 * Staging helper: simulate Twilio inbound SMS without signature validation.
 *
 * Enabled only when `NODE_ENV=development` or `ALLOW_DEV_OTP=true`.
 * Protected by `MATCHING_DEV_SECRET` (same header as start-matching).
 *
 * Example:
 *   curl -X POST http://localhost:3000/api/dev/sms-inbound \
 *     -H "Content-Type: application/json" \
 *     -H "x-matching-dev-secret: $MATCHING_DEV_SECRET" \
 *     -d '{"from":"+15551234567","body":"DIAGNOSING"}'
 */
export async function POST(request: Request) {
  if (!isDevBypassMode()) {
    return jsonError(
      404,
      "not_found",
      "Dev SMS inbound is only available in development or ALLOW_DEV_OTP mode.",
    );
  }

  const env = getEnv();
  const secret = request.headers.get(DEV_SECRET_HEADER);
  if (!secret || secret !== env.MATCHING_DEV_SECRET) {
    return jsonError(401, "unauthorized", "Invalid matching dev secret.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = devSmsInboundSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  let fromE164: string;
  try {
    fromE164 = normalizeUsPhone(parsed.data.from);
  } catch (error) {
    if (error instanceof InvalidPhoneError) {
      return jsonError(400, "invalid_phone", error.message);
    }
    throw error;
  }

  const mediaUrl = parsed.data.mediaUrl;
  const result = await handleInboundSms({
    From: fromE164,
    Body: parsed.data.body,
    MessageSid: `SMdev_${Date.now()}`,
    ...(mediaUrl
      ? {
          NumMedia: 1,
          MediaUrl0: mediaUrl,
          MediaContentType0: parsed.data.mediaContentType ?? "image/jpeg",
        }
      : {}),
  });

  return jsonOk({ ok: true, ...result });
}
