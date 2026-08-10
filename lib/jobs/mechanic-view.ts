import { formatScheduledTimeForDisplay } from "@/lib/bookings/scheduled-time";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { jobStatusOr } from "@/lib/jobs/status";
import { buildJobSmsContext } from "@/lib/matching/job-context";
import { assertMechanicAssigned } from "@/lib/service/guards";
import type { MechanicJobView } from "@/types/api/mechanic-job-view";
import type { JobsStatus } from "@/types/airtable/generated/enums";

const STATUS_LABELS: Record<string, string> = {
  accepted_by_mechanic: "Accepted",
  en_route: "En Route",
  arrived: "Arrived",
  vehicle_received: "Vehicle Received",
  diagnosing: "Diagnosing",
  quote_provided: "Quote Provided",
  awaiting_customer_approval: "Awaiting Customer Approval",
  approved_parts_pickup: "Parts Pickup",
  in_progress: "Repair Started",
  completed_pending_confirmation: "Completed",
  confirmed: "Confirmed",
  disputed: "Disputed",
  cancelled: "Cancelled",
  cancelled_after_diagnosis: "Cancelled",
  no_show_pending_review: "No-Show Review",
  matched_awaiting_response: "Matching",
  matched_awaiting_payment: "Awaiting Payment",
  awaiting_admin_match: "Awaiting Admin Match",
  draft: "Draft",
  refunded: "Refunded",
};

function formatStatusLabel(status: JobsStatus): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export async function getMechanicJobView(
  jobId: string,
  mechanicId: string,
): Promise<MechanicJobView> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  const smsContext = buildJobSmsContext(job);
  const details = parseQuoteDetails(job.fields.quote_details);
  const receiptUrl = job.fields.attachments?.[0]?.url ?? null;

  const driverId = job.fields.driver_id?.[0];
  let driver: MechanicJobView["driver"] = {
    zip: job.fields.zip_code ?? undefined,
  };

  if (driverId) {
    const driverRecord = await getDriverById(driverId);
    driver = {
      name: driverRecord.fields.name,
      phone: driverRecord.fields.phone_number,
      zip: job.fields.zip_code ?? driverRecord.fields.zip_code,
    };
  }

  const scheduledTime = job.fields.scheduled_time;

  return {
    jobId: job.id,
    status: jobStatusOr(job.fields.status),
    statusLabel: formatStatusLabel(jobStatusOr(job.fields.status)),
    vehicle: {
      year: job.fields.vehicle_year ?? null,
      make: job.fields.vehicle_make ?? null,
      model: job.fields.vehicle_model ?? null,
    },
    zipCode: job.fields.zip_code ?? null,
    serviceType: job.fields.service_type,
    serviceTypeLabel: smsContext.serviceTypeLabel,
    scheduledTime,
    scheduledTimeLabel: scheduledTime
      ? formatScheduledTimeForDisplay(scheduledTime)
      : undefined,
    issueText: job.fields.issue_text,
    diagnosisSummary: job.fields.diagnosis_summary,
    driver,
    partsCost: job.fields.parts_cost ?? null,
    onHand: job.fields.quote_parts_on_hand ?? false,
    receiptUrl,
    receiptStatus: details.receipt_status ?? null,
    partsReimbursementForfeited:
      details.parts_reimbursement_forfeited ?? false,
  };
}
