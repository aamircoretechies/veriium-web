import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  deriveAccountState,
  toMechanicAuthSummary,
} from "@/lib/auth/mechanic-otp";
import {
  InvalidMechanicSessionError,
  requireMechanicSession,
} from "@/lib/auth/mechanic-session";
import { getMechanicById } from "@/lib/mechanics/lookup";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireMechanicSession(request);
  } catch (error) {
    if (error instanceof InvalidMechanicSessionError) {
      return jsonError(401, "invalid_session", error.message);
    }
    throw error;
  }

  try {
    const record = await getMechanicById(session.mechanicId);
    const accountState = deriveAccountState(record.fields);

    if (accountState === "rejected" || accountState === "suspended") {
      return jsonError(
        403,
        "account_locked",
        accountState === "rejected"
          ? "Your application was not approved. Sign-in is not available for this account."
          : "Your account has been suspended. Sign-in is disabled.",
      );
    }

    return jsonOk({ mechanic: toMechanicAuthSummary(record) });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "mechanic_not_found", "Mechanic account not found.");
    }

    console.error(
      `[api/mechanics/me] mechanic ${session.mechanicId}:`,
      error,
    );
    throw error;
  }
}
