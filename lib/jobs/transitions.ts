import { JOB_STATUS, type JobStatus } from "@/lib/jobs/status";

/** Phase 5 — payment-phase statuses before matching begins. */
export const PAYMENT_PHASE_STATUSES = [
  JOB_STATUS.draft,
  JOB_STATUS.matched_awaiting_payment,
] as const;

export type PaymentPhaseStatus = (typeof PAYMENT_PHASE_STATUSES)[number];

export const PAYMENT_TRANSITIONS: Partial<
  Record<PaymentPhaseStatus, readonly JobStatus[]>
> = {
  [JOB_STATUS.draft]: [
    JOB_STATUS.matched_awaiting_payment,
    JOB_STATUS.cancelled,
  ],
  [JOB_STATUS.matched_awaiting_payment]: [
    JOB_STATUS.matched_awaiting_response,
    JOB_STATUS.cancelled,
  ],
};

const paymentPhaseStatusSet = new Set<JobStatus>(PAYMENT_PHASE_STATUSES);

/** Matching-phase statuses (tier encoded in match_tier when status is matched_awaiting_response). */
export const MATCHING_PHASE_STATUSES = [
  JOB_STATUS.matched_awaiting_response,
  JOB_STATUS.awaiting_admin_match,
  JOB_STATUS.accepted_by_mechanic,
] as const;

export type MatchingPhaseStatus = (typeof MATCHING_PHASE_STATUSES)[number];

const matchingPhaseStatusSet = new Set<JobStatus>(MATCHING_PHASE_STATUSES);

export const MATCHING_TRANSITIONS: Partial<
  Record<MatchingPhaseStatus, readonly JobStatus[]>
> = {
  [JOB_STATUS.matched_awaiting_response]: [
    JOB_STATUS.accepted_by_mechanic,
    JOB_STATUS.matched_awaiting_response,
    JOB_STATUS.awaiting_admin_match,
    JOB_STATUS.cancelled,
  ],
  [JOB_STATUS.awaiting_admin_match]: [
    JOB_STATUS.matched_awaiting_response,
    JOB_STATUS.cancelled,
  ],
};

/** Service-phase statuses from mechanic accept through job completion. */
export const SERVICE_PHASE_STATUSES = [
  JOB_STATUS.accepted_by_mechanic,
  JOB_STATUS.en_route,
  JOB_STATUS.vehicle_received,
  JOB_STATUS.arrived,
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
] as const;

export type ServicePhaseStatus = (typeof SERVICE_PHASE_STATUSES)[number];

const servicePhaseStatusSet = new Set<JobStatus>(SERVICE_PHASE_STATUSES);

export const ACTIVE_SERVICE_STATUSES = [
  JOB_STATUS.accepted_by_mechanic,
  JOB_STATUS.en_route,
  JOB_STATUS.vehicle_received,
  JOB_STATUS.arrived,
  JOB_STATUS.diagnosing,
  JOB_STATUS.quote_provided,
  JOB_STATUS.awaiting_customer_approval,
  JOB_STATUS.approved_parts_pickup,
  JOB_STATUS.in_progress,
] as const;

export type ActiveServiceStatus = (typeof ACTIVE_SERVICE_STATUSES)[number];

export const SERVICE_TRANSITIONS: Partial<
  Record<ServicePhaseStatus, readonly JobStatus[]>
> = {
  [JOB_STATUS.accepted_by_mechanic]: [
    JOB_STATUS.en_route,
    JOB_STATUS.vehicle_received,
    JOB_STATUS.cancelled,
  ],
  [JOB_STATUS.en_route]: [JOB_STATUS.arrived, JOB_STATUS.cancelled],
  [JOB_STATUS.vehicle_received]: [JOB_STATUS.diagnosing, JOB_STATUS.cancelled],
  [JOB_STATUS.arrived]: [
    JOB_STATUS.diagnosing,
    JOB_STATUS.no_show_pending_review,
  ],
  [JOB_STATUS.diagnosing]: [JOB_STATUS.quote_provided, JOB_STATUS.cancelled],
  [JOB_STATUS.quote_provided]: [
    JOB_STATUS.awaiting_customer_approval,
    JOB_STATUS.cancelled,
  ],
  [JOB_STATUS.awaiting_customer_approval]: [
    JOB_STATUS.approved_parts_pickup,
    JOB_STATUS.in_progress,
    JOB_STATUS.cancelled,
  ],
  [JOB_STATUS.approved_parts_pickup]: [
    JOB_STATUS.in_progress,
    JOB_STATUS.cancelled,
  ],
  [JOB_STATUS.in_progress]: [
    JOB_STATUS.completed_pending_confirmation,
    JOB_STATUS.awaiting_customer_approval,
    JOB_STATUS.cancelled,
  ],
  [JOB_STATUS.completed_pending_confirmation]: [
    JOB_STATUS.confirmed,
    JOB_STATUS.disputed,
  ],
  [JOB_STATUS.disputed]: [JOB_STATUS.confirmed, JOB_STATUS.refunded],
  [JOB_STATUS.no_show_pending_review]: [JOB_STATUS.cancelled],
};

export class InvalidJobTransitionError extends Error {
  readonly from: JobStatus;
  readonly to: JobStatus;

  constructor(from: JobStatus, to: JobStatus) {
    super(`Invalid job status transition: ${from} → ${to}`);
    this.name = "InvalidJobTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function isMatchingPhaseStatus(
  status: JobStatus,
): status is MatchingPhaseStatus {
  return matchingPhaseStatusSet.has(status);
}

export function isPaymentPhaseStatus(
  status: JobStatus,
): status is PaymentPhaseStatus {
  return paymentPhaseStatusSet.has(status);
}

export function isServicePhaseStatus(
  status: JobStatus,
): status is ServicePhaseStatus {
  return servicePhaseStatusSet.has(status);
}

export function isActiveServiceStatus(
  status: JobStatus,
): status is ActiveServiceStatus {
  return (ACTIVE_SERVICE_STATUSES as readonly JobStatus[]).includes(status);
}

export function assertPaymentTransition(from: JobStatus, to: JobStatus): void {
  if (!isPaymentPhaseStatus(from)) {
    throw new InvalidJobTransitionError(from, to);
  }

  const allowed = PAYMENT_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!isMatchingPhaseStatus(from)) {
    throw new InvalidJobTransitionError(from, to);
  }

  const allowed = MATCHING_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}

export function assertServiceTransition(from: JobStatus, to: JobStatus): void {
  if (!isServicePhaseStatus(from)) {
    throw new InvalidJobTransitionError(from, to);
  }

  const allowed = SERVICE_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}
