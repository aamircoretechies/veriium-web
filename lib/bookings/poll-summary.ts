import { JOB_STATUS } from "@/lib/jobs/status";
import type { JobStatus } from "@/lib/jobs/status";
import type { BookingSummary } from "@/types/api/booking-summary";

export const BOOKING_POLL_INTERVAL_MS = 4000;

export type MatchUiPhase =
  | "loading"
  | "searching"
  | "matched"
  | "tier4"
  | "cancelled"
  | "terminal";

const CANCELLED_STATUSES: JobStatus[] = [
  JOB_STATUS.cancelled,
  JOB_STATUS.cancelled_after_diagnosis,
];

const POST_MATCH_STATUSES: JobStatus[] = [
  JOB_STATUS.accepted_by_mechanic,
  JOB_STATUS.matched_awaiting_payment,
  JOB_STATUS.en_route,
  JOB_STATUS.arrived,
  JOB_STATUS.vehicle_received,
  JOB_STATUS.diagnosing,
  JOB_STATUS.quote_provided,
  JOB_STATUS.awaiting_customer_approval,
  JOB_STATUS.approved_parts_pickup,
  JOB_STATUS.in_progress,
  JOB_STATUS.completed_pending_confirmation,
  JOB_STATUS.confirmed,
  JOB_STATUS.disputed,
  JOB_STATUS.refunded,
  JOB_STATUS.no_show_pending_review,
];

export function getMatchUiPhase(status: JobStatus): MatchUiPhase {
  if (status === JOB_STATUS.matched_awaiting_response) {
    return "searching";
  }

  if (status === JOB_STATUS.awaiting_admin_match) {
    return "tier4";
  }

  if (CANCELLED_STATUSES.includes(status)) {
    return "cancelled";
  }

  if (POST_MATCH_STATUSES.includes(status)) {
    return "matched";
  }

  return "terminal";
}

export function shouldPollBookingPhase(phase: MatchUiPhase): boolean {
  return phase === "searching";
}

export class BookingSummaryFetchError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BookingSummaryFetchError";
    this.code = code;
  }
}

export async function fetchBookingSummary(
  jobId: string,
  token: string,
  signal?: AbortSignal,
): Promise<BookingSummary> {
  const url = `/api/bookings/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    let code = "request_failed";
    let message = "Unable to load booking status.";

    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // Keep default message.
    }

    throw new BookingSummaryFetchError(code, message);
  }

  return (await res.json()) as BookingSummary;
}
