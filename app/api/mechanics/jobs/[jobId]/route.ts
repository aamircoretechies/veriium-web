import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidMechanicSessionError,
  requireMechanicSession,
} from "@/lib/auth/mechanic-session";
import {
  getMechanicJobDetail,
  MechanicJobNotOnDashboardError,
} from "@/lib/jobs/mechanic-view";
import { MechanicNotAssignedError } from "@/lib/matching/errors";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params;

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
    const job = await getMechanicJobDetail(jobId, session.mechanicId);
    return jsonOk({ job });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", "Job not found.");
    }
    if (error instanceof MechanicNotAssignedError) {
      return jsonError(403, "not_assigned", error.message);
    }
    if (error instanceof MechanicJobNotOnDashboardError) {
      return jsonError(404, "job_not_found", error.message);
    }
    console.error(
      `[api/mechanics/jobs/${jobId}] mechanic ${session.mechanicId}:`,
      error,
    );
    throw error;
  }
}
