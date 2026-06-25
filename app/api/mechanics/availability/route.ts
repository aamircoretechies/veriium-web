import { z } from "zod";

import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidMechanicSessionError,
  requireMechanicSession,
} from "@/lib/auth/mechanic-session";
import {
  MechanicNotEligibleForAvailabilityError,
  setMechanicAvailability,
} from "@/lib/mechanics/availability";
import { setMechanicAvailabilitySchema } from "@/types/api/mechanic-auth";

export async function POST(request: Request) {
  let session;
  try {
    session = await requireMechanicSession(request);
  } catch (error) {
    if (error instanceof InvalidMechanicSessionError) {
      return jsonError(401, "invalid_session", error.message);
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = setMechanicAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const result = await setMechanicAvailability(
      session.mechanicId,
      parsed.data.available,
    );
    return jsonOk(result);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "mechanic_not_found", "Mechanic account not found.");
    }
    if (error instanceof MechanicNotEligibleForAvailabilityError) {
      return jsonError(409, "not_eligible", error.message);
    }

    console.error(
      `[api/mechanics/availability] mechanic ${session.mechanicId}:`,
      error,
    );
    throw error;
  }
}
