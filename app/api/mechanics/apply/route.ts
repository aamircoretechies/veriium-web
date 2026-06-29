import { z } from "zod";
import {
  DuplicatePhoneError,
  submitMechanicApplication,
} from "@/lib/mechanics/apply";
import { InvalidZipError } from "@/lib/mechanics/errors";
import { InvalidPhoneError } from "@/lib/phone";
import { jsonError, jsonOk } from "@/lib/api/response";
import { mechanicApplicationSchema } from "@/types/api/mechanic-application";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = mechanicApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const result = await submitMechanicApplication(parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    if (error instanceof DuplicatePhoneError) {
      return jsonError(409, "duplicate_phone", error.message);
    }
    if (error instanceof InvalidPhoneError) {
      return jsonError(400, "invalid_phone", error.message);
    }
    if (error instanceof InvalidZipError) {
      return jsonError(400, "validation_error", error.message);
    }
    throw error;
  }
}
