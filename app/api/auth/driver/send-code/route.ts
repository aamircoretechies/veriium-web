import { z } from "zod";
import { sendDriverOtp } from "@/lib/auth/driver-otp";
import { jsonError, jsonOk } from "@/lib/api/response";
import { InvalidPhoneError } from "@/lib/phone";
import { TwilioError } from "@/lib/twilio";
import { sendDriverCodeSchema } from "@/types/api/driver-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = sendDriverCodeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    await sendDriverOtp(parsed.data.phone);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof InvalidPhoneError) {
      return jsonError(400, "invalid_phone", error.message);
    }
    if (error instanceof TwilioError) {
      if (error.status === 429 || error.code === 60203) {
        return jsonError(
          429,
          "rate_limited",
          "Too many verification attempts. Please try again later.",
        );
      }
      return jsonError(502, "sms_failed", error.message);
    }
    throw error;
  }
}
