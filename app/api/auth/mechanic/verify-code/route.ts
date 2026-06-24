import { z } from "zod";
import {
  InvalidOtpError,
  MechanicLockoutError,
  MechanicNotFoundError,
  verifyMechanicOtp,
} from "@/lib/auth/mechanic-otp";
import { jsonError, jsonOk } from "@/lib/api/response";
import { InvalidPhoneError } from "@/lib/phone";
import { verifyMechanicCodeSchema } from "@/types/api/mechanic-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = verifyMechanicCodeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const result = await verifyMechanicOtp(parsed.data.phone, parsed.data.code);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof MechanicNotFoundError) {
      return jsonError(404, "not_found", error.message);
    }
    if (error instanceof MechanicLockoutError) {
      return jsonError(403, "account_locked", error.message);
    }
    if (error instanceof InvalidOtpError) {
      return jsonError(400, "invalid_code", error.message);
    }
    if (error instanceof InvalidPhoneError) {
      return jsonError(400, "invalid_phone", error.message);
    }
    throw error;
  }
}
