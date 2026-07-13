import { z } from "zod";

import { AirtableError } from "@/lib/airtable";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import {
  InvalidMechanicSessionError,
  requireMechanicSession,
} from "@/lib/auth/mechanic-session";
import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { getJobById } from "@/lib/jobs/lookup";
import { MechanicNotAssignedError } from "@/lib/matching/errors";
import {
  ReceiptAlreadySubmittedError,
  ReceiptNotEligibleError,
} from "@/lib/receipts/errors";
import { submitReceipt } from "@/lib/receipts/submit";
import { assertMechanicAssigned } from "@/lib/service/guards";

const submitReceiptBodySchema = z.object({
  receiptUrl: z.string().url(),
});

type RouteContext = { params: Promise<{ jobId: string }> };

async function resolveMechanicId(
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
    const job = await getJobById(jobId);
    assertMechanicAssigned(job, mechanicId);

    const details = parseQuoteDetails(job.fields.quote_details);
    const receiptUrl = job.fields.attachments?.[0]?.url ?? null;

    return jsonOk({
      jobId: job.id,
      status: job.fields.status,
      partsCost: job.fields.parts_cost ?? null,
      onHand: job.fields.quote_parts_on_hand ?? false,
      receiptUrl,
      receiptStatus: details.receipt_status ?? null,
      receiptSubmittedAt: null,
      partsReimbursementForfeited: details.parts_reimbursement_forfeited ?? false,
      vehicle: {
        year: job.fields.vehicle_year ?? null,
        make: job.fields.vehicle_make ?? null,
        model: job.fields.vehicle_model ?? null,
      },
      zipCode: job.fields.zip_code ?? null,
    });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", "Job not found.");
    }
    if (error instanceof MechanicNotAssignedError) {
      return jsonError(403, "not_assigned", error.message);
    }
    console.error(`[api/jobs/${jobId}] GET:`, error);
    throw error;
  }
}

export async function POST(request: Request, context: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = submitReceiptBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const result = await submitReceipt({
      jobId,
      mechanicId,
      receiptUrl: parsed.data.receiptUrl,
      source: "web",
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "job_not_found", "Job not found.");
    }
    if (error instanceof MechanicNotAssignedError) {
      return jsonError(403, "not_assigned", error.message);
    }
    if (error instanceof ReceiptAlreadySubmittedError) {
      return jsonError(409, "already_submitted", error.message);
    }
    if (error instanceof ReceiptNotEligibleError) {
      return jsonError(409, "not_eligible", error.message);
    }
    console.error(`[api/jobs/${jobId}/receipt] POST:`, error);
    throw error;
  }
}
