import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidMechanicSessionError,
  requireMechanicSession,
} from "@/lib/auth/mechanic-session";
import { listMechanicDashboardJobs } from "@/lib/jobs/mechanic-jobs";

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
    const jobs = await listMechanicDashboardJobs(session.mechanicId);
    return jsonOk(jobs);
  } catch (error) {
    console.error(
      `[api/mechanics/jobs] mechanic ${session.mechanicId}:`,
      error,
    );
    throw error;
  }
}
