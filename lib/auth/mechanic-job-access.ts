import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import { requireMechanicSession } from "@/lib/auth/mechanic-session";
import { getJobById } from "@/lib/jobs/lookup";
import { MechanicNotAssignedError } from "@/lib/matching/errors";
import { assertMechanicAssigned } from "@/lib/service/guards";

/** Resolve mechanic ID from signed URL token or Bearer session. */
export async function resolveMechanicId(
  request: Request,
  jobId: string,
): Promise<string> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token) {
    try {
      await verifyJobAccessToken(jobId, token);
    } catch (error) {
      if (error instanceof InvalidJobAccessTokenError) {
        throw error;
      }
      throw new InvalidJobAccessTokenError();
    }

    const job = await getJobById(jobId);
    const mechanicId = job.fields.mechanic_id?.[0];
    if (!mechanicId) {
      throw new MechanicNotAssignedError(jobId, "signed-url");
    }
    return mechanicId;
  }

  const session = await requireMechanicSession(request);
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, session.mechanicId);
  return session.mechanicId;
}
