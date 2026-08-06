import { z } from "zod";

import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidMechanicSessionError,
  requireMechanicSession,
} from "@/lib/auth/mechanic-session";
import {
  completeMechanicSetup,
  MechanicNotEligibleForSetupError,
  MechanicSetupIncompleteError,
} from "@/lib/mechanics/setup";
import { mechanicSetupRequestSchema } from "@/types/api/mechanic-setup";

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

  const parsed = mechanicSetupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const mechanic = await completeMechanicSetup(
      session.mechanicId,
      parsed.data,
    );
    return jsonOk({ mechanic });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "mechanic_not_found", "Mechanic account not found.");
    }
    if (error instanceof MechanicNotEligibleForSetupError) {
      return jsonError(403, "not_eligible", error.message);
    }
    if (error instanceof MechanicSetupIncompleteError) {
      return jsonError(400, "setup_incomplete", error.message);
    }

    console.error(
      `[api/mechanics/setup] mechanic ${session.mechanicId}:`,
      error,
    );
    throw error;
  }
}
