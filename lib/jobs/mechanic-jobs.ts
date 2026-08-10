import { getAirtableClient } from "@/lib/airtable";
import { eq, or } from "@/lib/airtable/formula";
import { formatScheduledTimeForDisplay } from "@/lib/bookings/scheduled-time";
import { formatCurrency } from "@/lib/bookings/driver-job-status";
import { getDriverById } from "@/lib/drivers/lookup";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { ACTIVE_SERVICE_STATUSES } from "@/lib/jobs/transitions";
import { buildJobSmsContext } from "@/lib/matching/job-context";
import { mechanicLinkedToJob } from "@/lib/service/guards";
import type {
  MechanicJobListItem,
  MechanicJobListStatus,
  MechanicJobsResponse,
} from "@/types/api/mechanic-jobs";
import type { AirtableRecord } from "@/types/airtable/common";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { JobsStatus } from "@/types/airtable/generated/enums";
import type { JobFields } from "@/types/airtable/jobs";

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

const MECHANIC_DASHBOARD_ACTIVE_STATUSES: readonly JobsStatus[] = [
  JOB_STATUS.matched_awaiting_payment,
  ...ACTIVE_SERVICE_STATUSES,
];

const MECHANIC_DASHBOARD_COMPLETED_STATUSES: readonly JobsStatus[] = [
  JOB_STATUS.completed_pending_confirmation,
  JOB_STATUS.confirmed,
  JOB_STATUS.disputed,
  JOB_STATUS.refunded,
];

const DASHBOARD_QUERY_STATUSES: readonly JobsStatus[] = [
  ...MECHANIC_DASHBOARD_ACTIVE_STATUSES,
  ...MECHANIC_DASHBOARD_COMPLETED_STATUSES,
];

const UNKNOWN_COST = "—";

export function classifyMechanicJobListStatus(
  status: JobsStatus,
): MechanicJobListStatus | null {
  if ((MECHANIC_DASHBOARD_ACTIVE_STATUSES as readonly string[]).includes(status)) {
    return "active";
  }
  if (
    (MECHANIC_DASHBOARD_COMPLETED_STATUSES as readonly string[]).includes(status)
  ) {
    return "completed";
  }
  return null;
}

function formatStatusLabel(status: JobsStatus): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function formatCustomerDisplayName(name?: string): string {
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

function formatVehicleLabel(job: AirtableRecord<JobFields>): string {
  const { vehicle_year: year, vehicle_make: make, vehicle_model: model } =
    job.fields;
  const parts = [year, make, model].filter(
    (part) => part !== undefined && part !== "",
  );
  return parts.length > 0 ? parts.join(" ") : "Vehicle details pending";
}

function formatJobTitle(job: AirtableRecord<JobFields>): string {
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

function formatDiagnosisCostEstimate(raw?: string): string | undefined {
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

function formatActiveCost(job: AirtableRecord<JobFields>): {
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

function formatCompletedCost(job: AirtableRecord<JobFields>): {
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

function formatCompletedDate(iso?: string): string {
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

function buildStatusFilterFormula(): string {
  if (DASHBOARD_QUERY_STATUSES.length === 1) {
    return eq(FIELDS.Jobs.status, DASHBOARD_QUERY_STATUSES[0]!);
  }
  return or(
    ...DASHBOARD_QUERY_STATUSES.map((status) =>
      eq(FIELDS.Jobs.status, status),
    ),
  );
}

async function resolveCustomerName(
  job: AirtableRecord<JobFields>,
  driverCache: Map<string, string>,
): Promise<string> {
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return "Customer";
  }

  const cached = driverCache.get(driverId);
  if (cached) {
    return cached;
  }

  try {
    const driver = await getDriverById(driverId);
    const displayName = formatCustomerDisplayName(driver.fields.name);
    driverCache.set(driverId, displayName);
    return displayName;
  } catch {
    return "Customer";
  }
}

async function mapJobToListItem(
  job: AirtableRecord<JobFields>,
  listStatus: MechanicJobListStatus,
  driverCache: Map<string, string>,
): Promise<MechanicJobListItem> {
  const status = jobStatusOr(job.fields.status);
  const cost =
    listStatus === "active"
      ? formatActiveCost(job)
      : formatCompletedCost(job);

  const dateLabel = listStatus === "active" ? "Requested" : "Completed";
  const dateValue =
    listStatus === "active"
      ? job.fields.scheduled_time
        ? formatScheduledTimeForDisplay(job.fields.scheduled_time)
        : UNKNOWN_COST
      : formatCompletedDate(
          job.fields.completed_at ?? job.fields.scheduled_time,
        );

  return {
    jobId: job.id,
    listStatus,
    status,
    statusLabel: formatStatusLabel(status),
    title: formatJobTitle(job),
    customerName: await resolveCustomerName(job, driverCache),
    vehicleLabel: formatVehicleLabel(job),
    dateLabel,
    dateValue,
    costLabel: cost.costLabel,
    costValue: cost.costValue,
  };
}

export async function listMechanicDashboardJobs(
  mechanicId: string,
): Promise<MechanicJobsResponse> {
  const client = getAirtableClient();
  const response = await client.listRecords<JobFields>("jobs", {
    filterByFormula: buildStatusFilterFormula(),
    maxRecords: 100,
    sort: [{ field: FIELDS.Jobs.created_at, direction: "desc" }],
  });

  const mechanicJobs = response.records.filter((job) =>
    mechanicLinkedToJob(job, mechanicId),
  );

  const driverCache = new Map<string, string>();
  const active: MechanicJobListItem[] = [];
  const completed: MechanicJobListItem[] = [];

  for (const job of mechanicJobs) {
    const listStatus = classifyMechanicJobListStatus(
      jobStatusOr(job.fields.status),
    );
    if (!listStatus) {
      continue;
    }

    const item = await mapJobToListItem(job, listStatus, driverCache);
    if (listStatus === "active") {
      active.push(item);
    } else {
      completed.push(item);
    }
  }

  return { active, completed };
}
