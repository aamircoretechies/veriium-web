import { AirtableError } from "@/lib/airtable";
import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getBookingSummary } from "@/lib/bookings/summary";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return jsonError(401, "invalid_token", "Missing job access token.");
  }

  try {
    await verifyJobAccessToken(jobId, token);
  } catch (error) {
    if (error instanceof InvalidJobAccessTokenError) {
      return jsonError(401, "invalid_token", error.message);
    }
    throw error;
  }

  try {
    const summary = await getBookingSummary(jobId);
    return jsonOk(summary);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "booking_not_found", `Booking ${jobId} not found.`);
    }
    throw error;
  }
}
