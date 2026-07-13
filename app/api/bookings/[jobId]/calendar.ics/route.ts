import { NextResponse } from "next/server";

import { AirtableError } from "@/lib/airtable";
import { jsonError } from "@/lib/api/response";
import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import { buildBookingCalendarIcs } from "@/lib/bookings/calendar";
import { getBookingSummary } from "@/lib/bookings/summary";
import { getJobById } from "@/lib/jobs/lookup";

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
    const job = await getJobById(jobId);
    const ics = buildBookingCalendarIcs({
      jobId,
      job: {
        zip_code: summary.zip,
        service_type: summary.serviceType,
        scheduled_time: summary.scheduledTime,
        created_at: job.fields.created_at,
      },
      diagnosisSummary: summary.diagnosis.summary,
      signedUrl: summary.signedUrl,
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="veriium-${jobId}.ics"`,
      },
    });
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return jsonError(404, "booking_not_found", `Booking ${jobId} not found.`);
    }
    throw error;
  }
}
