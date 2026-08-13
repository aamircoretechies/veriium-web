import { JOB_STATUS } from "@/lib/jobs/status";
import { ACTIVE_SERVICE_STATUSES } from "@/lib/jobs/transitions";
import type { MechanicJobListStatus } from "@/types/api/mechanic-job-view";
import type { JobsStatus } from "@/types/airtable/generated/enums";

export const MECHANIC_DASHBOARD_ACTIVE_STATUSES: readonly JobsStatus[] = [
  JOB_STATUS.matched_awaiting_payment,
  ...ACTIVE_SERVICE_STATUSES,
];

export const MECHANIC_DASHBOARD_COMPLETED_STATUSES: readonly JobsStatus[] = [
  JOB_STATUS.completed_pending_confirmation,
  JOB_STATUS.confirmed,
  JOB_STATUS.disputed,
  JOB_STATUS.refunded,
];

export const DASHBOARD_QUERY_STATUSES: readonly JobsStatus[] = [
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
