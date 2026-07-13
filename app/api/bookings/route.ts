import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { InvalidOtpError } from "@/lib/auth/driver-otp";
import { createBooking } from "@/lib/bookings/create";
import {
  DiagnosisNotFoundError,
  InvalidVehicleError,
  OutOfServiceAreaError,
} from "@/lib/bookings/errors";
import { InvalidPhoneError } from "@/lib/phone";
import { TwilioError } from "@/lib/twilio";
import { bookingRequestSchema } from "@/types/api/booking";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const result = await createBooking(parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    if (error instanceof OutOfServiceAreaError) {
      return jsonError(400, "out_of_service_area", error.message);
    }
    if (error instanceof InvalidOtpError) {
      return jsonError(400, "invalid_code", error.message);
    }
    if (error instanceof DiagnosisNotFoundError) {
      return jsonError(404, "diagnosis_not_found", error.message);
    }
    if (error instanceof InvalidVehicleError) {
      return jsonError(400, "invalid_vehicle", error.message);
    }
    if (error instanceof InvalidPhoneError) {
      return jsonError(400, "invalid_phone", error.message);
    }
    if (error instanceof TwilioError) {
      return jsonError(502, "sms_failed", error.message);
    }
    throw error;
  }
}
