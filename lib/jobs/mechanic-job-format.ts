import { formatScheduledTimeForDisplay } from "@/lib/bookings/scheduled-time";
import { formatCurrency } from "@/lib/bookings/driver-job-status";
import { buildJobSmsContext } from "@/lib/matching/job-context";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobsStatus } from "@/types/airtable/generated/enums";
import type { JobFields } from "@/types/airtable/jobs";

export const UNKNOWN_COST = "—";

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

export function formatMechanicJobStatusLabel(status: JobsStatus): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function formatCustomerDisplayName(name?: string): string {
  if (!name?.trim()) {
    return "Customer";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!;
  }

  const lastInitial = parts[parts.length - 1]![0];
  return `${parts[0]} ${lastInitial}.`;
}

export function formatVehicleLabel(job: AirtableRecord<JobFields>): string {
  const { vehicle_year: year, vehicle_make: make, vehicle_model: model } =
    job.fields;
  const parts = [year, make, model].filter(
    (part) => part !== undefined && part !== "",
  );
  return parts.length > 0 ? parts.join(" ") : "Vehicle details pending";
}

export function formatJobTitle(job: AirtableRecord<JobFields>): string {
  const summary = job.fields.diagnosis_summary?.trim();
  if (summary) {
    return summary;
  }

  const categoryLabel = buildJobSmsContext(job).categoryLabel;
  if (categoryLabel) {
    return categoryLabel;
  }

  return "Repair request";
}

export function formatDiagnosisCostEstimate(raw?: string): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const [lowText, highText] = raw.split("-").map((part) => part.trim());
  const low = Number.parseInt(lowText ?? "", 10);
  const high = Number.parseInt(highText ?? "", 10);

  if (Number.isFinite(low) && Number.isFinite(high)) {
    return `$${low} – $${high}`;
  }
  if (Number.isFinite(low)) {
    return formatCurrency(low);
  }
  if (Number.isFinite(high)) {
    return formatCurrency(high);
  }

  return undefined;
}

export function formatActiveCost(job: AirtableRecord<JobFields>): {
  costLabel: string;
  costValue: string;
} {
  const estimate =
    formatDiagnosisCostEstimate(job.fields.diagnosis_cost_estimate) ??
    formatCurrency(job.fields.price_estimate);

  return {
    costLabel: "Est. Cost",
    costValue: estimate ?? UNKNOWN_COST,
  };
}

export function formatCompletedCost(job: AirtableRecord<JobFields>): {
  costLabel: string;
  costValue: string;
} {
  const total =
    formatCurrency(job.fields.quote_total ?? job.fields.final_price) ??
    UNKNOWN_COST;

  return {
    costLabel: "Final Cost",
    costValue: total,
  };
}

export function formatCompletedDate(iso?: string): string {
  if (!iso?.trim()) {
    return UNKNOWN_COST;
  }

  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatActiveDateValue(job: AirtableRecord<JobFields>): string {
  return job.fields.scheduled_time
    ? formatScheduledTimeForDisplay(job.fields.scheduled_time)
    : UNKNOWN_COST;
}

export function formatEstimatedCostRange(
  job: AirtableRecord<JobFields>,
): string | undefined {
  return (
    formatDiagnosisCostEstimate(job.fields.diagnosis_cost_estimate) ??
    formatCurrency(job.fields.price_estimate)
  );
}
