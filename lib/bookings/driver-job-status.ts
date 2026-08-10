import { JOB_STATUS, type JobStatus } from "@/lib/jobs/status";
import type { Driveability } from "@/types/airtable/enums";

export const DRIVER_TIMELINE_STEPS = [
  { id: "confirmed", label: "Booking Confirmed" },
  { id: "assigned", label: "Mechanic Assigned" },
  { id: "en_route", label: "En Route" },
  { id: "arrived", label: "Arrived" },
  { id: "diagnosing", label: "Diagnosing" },
  { id: "quote_provided", label: "Quote Provided" },
  { id: "repair_started", label: "Repair Started" },
  { id: "completed", label: "Repair Completed" },
] as const;

const CANCELLED_STATUSES: JobStatus[] = [
  JOB_STATUS.cancelled,
  JOB_STATUS.cancelled_after_diagnosis,
];

const TERMINAL_STATUSES: JobStatus[] = [
  JOB_STATUS.confirmed,
  JOB_STATUS.disputed,
  JOB_STATUS.refunded,
  JOB_STATUS.no_show_pending_review,
  ...CANCELLED_STATUSES,
];

const PRE_MATCH_STATUSES: JobStatus[] = [
  JOB_STATUS.draft,
  JOB_STATUS.scheduled,
  JOB_STATUS.matched_awaiting_response,
  JOB_STATUS.awaiting_admin_match,
];

const STATUS_TO_STEP_INDEX: Partial<Record<JobStatus, number>> = {
  [JOB_STATUS.accepted_by_mechanic]: 1,
  [JOB_STATUS.matched_awaiting_payment]: 1,
  [JOB_STATUS.en_route]: 2,
  [JOB_STATUS.arrived]: 3,
  [JOB_STATUS.vehicle_received]: 3,
  [JOB_STATUS.diagnosing]: 4,
  [JOB_STATUS.quote_provided]: 5,
  [JOB_STATUS.awaiting_customer_approval]: 5,
  [JOB_STATUS.approved_parts_pickup]: 6,
  [JOB_STATUS.in_progress]: 6,
  [JOB_STATUS.completed_pending_confirmation]: 7,
  [JOB_STATUS.confirmed]: 7,
};

export type DriverJobUiPhase =
  | "active"
  | "cancelled"
  | "terminal"
  | "pre_match";

export type DriverQuoteUiStatus = "pending" | "approved" | "declined" | "none";

export function getDriverJobUiPhase(status: JobStatus): DriverJobUiPhase {
  if (CANCELLED_STATUSES.includes(status)) {
    return "cancelled";
  }
  if (PRE_MATCH_STATUSES.includes(status)) {
    return "pre_match";
  }
  if (
    status === JOB_STATUS.disputed ||
    status === JOB_STATUS.refunded ||
    status === JOB_STATUS.no_show_pending_review
  ) {
    return "terminal";
  }
  return "active";
}

export function getDriverTimelineStepIndex(status: JobStatus): number {
  return STATUS_TO_STEP_INDEX[status] ?? 0;
}

export function getDriverTimelineLabel(status: JobStatus): string {
  const stepIndex = getDriverTimelineStepIndex(status);
  return DRIVER_TIMELINE_STEPS[stepIndex]?.label ?? "Status update pending";
}

export function shouldPollDriverJobStatus(status: JobStatus): boolean {
  if (TERMINAL_STATUSES.includes(status)) {
    return false;
  }
  if (PRE_MATCH_STATUSES.includes(status)) {
    return false;
  }
  return true;
}

export function shouldShowDiagnosisSection(stepIndex: number): boolean {
  return stepIndex >= 4;
}

export function shouldShowQuoteSection(stepIndex: number): boolean {
  return stepIndex >= 5;
}

export function formatCostEstimateRange(
  low?: number,
  high?: number,
): string | undefined {
  if (low === undefined && high === undefined) {
    return undefined;
  }
  if (low !== undefined && high !== undefined) {
    return `$${low} - $${high}`;
  }
  const value = low ?? high;
  return value !== undefined ? `$${value}` : undefined;
}

export function formatDriveabilitySeverity(
  driveability?: Driveability,
): string | undefined {
  if (driveability === "do_not_drive") {
    return "High";
  }
  if (driveability === "caution") {
    return "Medium";
  }
  if (driveability === "safe") {
    return "Low";
  }
  return undefined;
}

export function getDriverQuoteUiStatus(status: JobStatus): DriverQuoteUiStatus {
  if (
    status === JOB_STATUS.quote_provided ||
    status === JOB_STATUS.awaiting_customer_approval
  ) {
    return "pending";
  }
  if (
    status === JOB_STATUS.approved_parts_pickup ||
    status === JOB_STATUS.in_progress ||
    status === JOB_STATUS.completed_pending_confirmation ||
    status === JOB_STATUS.confirmed
  ) {
    return "approved";
  }
  if (status === JOB_STATUS.cancelled_after_diagnosis) {
    return "declined";
  }
  return "none";
}

export function formatCurrency(amount?: number): string | undefined {
  if (amount === undefined) {
    return undefined;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
