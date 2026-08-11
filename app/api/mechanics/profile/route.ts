import { z } from "zod";

import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidMechanicSessionError,
  requireMechanicSession,
} from "@/lib/auth/mechanic-session";
import {
  InvalidAttachmentUrlError,
  MechanicNotEligibleForProfileUpdateError,
  updateMechanicProfile,
} from "@/lib/mechanics/update-profile";
import { mechanicProfilePatchSchema } from "@/types/api/mechanic-profile";

export async function PATCH(request: Request) {
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

  const parsed = mechanicProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const profile = await updateMechanicProfile(
      session.mechanicId,
      parsed.data,
    );
    return jsonOk({ profile });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "mechanic_not_found", "Mechanic account not found.");
    }
    if (error instanceof MechanicNotEligibleForProfileUpdateError) {
      return jsonError(403, "not_eligible", error.message);
    }
    if (error instanceof InvalidAttachmentUrlError) {
      return jsonError(400, "invalid_attachment_url", error.message);
    }

    console.error(
      `[api/mechanics/profile] mechanic ${session.mechanicId}:`,
      error,
    );
    throw error;
  }
}
