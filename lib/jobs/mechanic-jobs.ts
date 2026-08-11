import { getAirtableClient } from "@/lib/airtable";
import { eq, or } from "@/lib/airtable/formula";
import {
  formatActiveCost,
  formatActiveDateValue,
  formatCompletedCost,
  formatCompletedDate,
  formatCustomerDisplayName,
  formatJobTitle,
  formatMechanicJobStatusLabel,
  formatVehicleLabel,
} from "@/lib/jobs/mechanic-job-format";
import {
  buildJobSchedulingFields,
  resolveDriverForJob,
} from "@/lib/jobs/mechanic-view";
import { JOB_STATUS, jobStatusOr } from "@/lib/jobs/status";
import { ACTIVE_SERVICE_STATUSES } from "@/lib/jobs/transitions";
import { mechanicLinkedToJob } from "@/lib/service/guards";
import type {
  MechanicJobListItem,
  MechanicJobListStatus,
  MechanicJobsResponse,
} from "@/types/api/mechanic-jobs";
import type { MechanicJobView } from "@/types/api/mechanic-job-view";
import type { AirtableRecord } from "@/types/airtable/common";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { JobsStatus } from "@/types/airtable/generated/enums";
import type { JobFields } from "@/types/airtable/jobs";

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

async function resolveDriverForJobCached(
  job: AirtableRecord<JobFields>,
  driverCache: Map<string, MechanicJobView["driver"]>,
): Promise<MechanicJobView["driver"]> {
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return resolveDriverForJob(job);
  }

  const cached = driverCache.get(driverId);
  if (cached) {
    return cached;
  }

  const driver = await resolveDriverForJob(job);
  driverCache.set(driverId, driver);
  return driver;
}

export async function mapJobToListItem(
  job: AirtableRecord<JobFields>,
  listStatus: MechanicJobListStatus,
  driverCache: Map<string, MechanicJobView["driver"]>,
): Promise<MechanicJobListItem> {
  const status = jobStatusOr(job.fields.status);
  const cost =
    listStatus === "active"
      ? formatActiveCost(job)
      : formatCompletedCost(job);

  const dateLabel = listStatus === "active" ? "Requested" : "Completed";
  const dateValue =
    listStatus === "active"
      ? formatActiveDateValue(job)
      : formatCompletedDate(
          job.fields.completed_at ?? job.fields.scheduled_time,
        );

  const driver = await resolveDriverForJobCached(job, driverCache);
  const scheduling = buildJobSchedulingFields(job);

  return {
    jobId: job.id,
    listStatus,
    status,
    statusLabel: formatMechanicJobStatusLabel(status),
    title: formatJobTitle(job),
    customerName: formatCustomerDisplayName(driver.name),
    vehicleLabel: formatVehicleLabel(job),
    dateLabel,
    dateValue,
    costLabel: cost.costLabel,
    costValue: cost.costValue,
    driver,
    zipCode: scheduling.zipCode,
    serviceTypeLabel: scheduling.serviceTypeLabel,
    scheduledTimeLabel: scheduling.scheduledTimeLabel,
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

  const driverCache = new Map<string, MechanicJobView["driver"]>();
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
