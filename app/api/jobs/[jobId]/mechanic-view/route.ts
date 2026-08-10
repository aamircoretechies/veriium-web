import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import { resolveMechanicId } from "@/lib/auth/mechanic-job-access";
import { InvalidJobAccessTokenError } from "@/lib/auth/signed-url";
import { InvalidMechanicSessionError } from "@/lib/auth/mechanic-session";
import { getMechanicJobView } from "@/lib/jobs/mechanic-view";
import { MechanicNotAssignedError } from "@/lib/matching/errors";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  let mechanicId: string;
  try {
    mechanicId = await resolveMechanicId(request, jobId);
  } catch (error) {
    if (error instanceof InvalidMechanicSessionError) {
      return jsonError(401, "invalid_session", error.message);
    }
    if (error instanceof InvalidJobAccessTokenError) {
      return jsonError(401, "invalid_token", error.message);
    }
    if (error instanceof MechanicNotAssignedError) {
      return jsonError(403, "not_assigned", error.message);
    }
    throw error;
  }

  try {
    const view = await getMechanicJobView(jobId, mechanicId);
    return jsonOk(view);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", "Job not found.");
    }
    if (error instanceof MechanicNotAssignedError) {
      return jsonError(403, "not_assigned", error.message);
    }
    console.error(`[api/jobs/${jobId}/mechanic-view] GET:`, error);
    throw error;
  }
}
