import type { JobStatus } from "@/types/airtable/enums";

/** Phase 5 — payment-phase statuses before matching begins. */
export const PAYMENT_PHASE_STATUSES = [
  "draft",
  "matched_awaiting_payment",
] as const;

export type PaymentPhaseStatus = (typeof PAYMENT_PHASE_STATUSES)[number];

export const PAYMENT_TRANSITIONS: Partial<
  Record<PaymentPhaseStatus, readonly JobStatus[]>
> = {
  draft: ["matched_awaiting_payment", "cancelled"],
  matched_awaiting_payment: ["matched", "cancelled"],
};

const paymentPhaseStatusSet = new Set<JobStatus>(PAYMENT_PHASE_STATUSES);

/** Appendix B — matching-phase statuses owned by Phase 4. */
export const MATCHING_PHASE_STATUSES = [
  "matched",
  "matched_tier2",
  "matched_tier3",
  "awaiting_admin_match",
  "accepted_by_mechanic",
] as const;

export type MatchingPhaseStatus = (typeof MATCHING_PHASE_STATUSES)[number];

const matchingPhaseStatusSet = new Set<JobStatus>(MATCHING_PHASE_STATUSES);

/**
 * Allowed matching-phase transitions (Appendix B).
 * Phase 5 owns `draft → matched_awaiting_payment → matched`; those are not listed here.
 */
export const MATCHING_TRANSITIONS: Partial<
  Record<MatchingPhaseStatus, readonly JobStatus[]>
> = {
  matched: ["accepted_by_mechanic", "matched_tier2", "cancelled"],
  matched_tier2: ["accepted_by_mechanic", "matched_tier3", "cancelled"],
  matched_tier3: ["accepted_by_mechanic", "awaiting_admin_match", "cancelled"],
  awaiting_admin_match: ["matched", "cancelled"],
};

/** Appendix B — service-phase statuses from mechanic accept through job completion. */
export const SERVICE_PHASE_STATUSES = [
  "accepted_by_mechanic",
  "en_route",
  "vehicle_received",
  "arrived",
  "diagnosing",
  "quote_pending_admin",
  "quote_submitted",
  "quote_approved",
  "awaiting_parts_consent",
  "quote_declined",
  "requote_submitted",
  "in_progress",
  "completed_pending_confirmation",
  "confirmed",
  "disputed",
  "refunded",
  "no_show_pending_review",
] as const;

export type ServicePhaseStatus = (typeof SERVICE_PHASE_STATUSES)[number];

const servicePhaseStatusSet = new Set<JobStatus>(SERVICE_PHASE_STATUSES);

/** Statuses where a mechanic still has an active in-flight job (SMS routing). */
export const ACTIVE_SERVICE_STATUSES = [
  "accepted_by_mechanic",
  "en_route",
  "vehicle_received",
  "arrived",
  "diagnosing",
  "quote_pending_admin",
  "quote_submitted",
  "quote_approved",
  "requote_submitted",
  "in_progress",
] as const;

export type ActiveServiceStatus = (typeof ACTIVE_SERVICE_STATUSES)[number];

/**
 * Allowed service-phase transitions (Appendix B).
 * `accepted_by_mechanic` is the handoff from matching; outgoing moves are service-owned.
 */
export const SERVICE_TRANSITIONS: Partial<
  Record<ServicePhaseStatus, readonly JobStatus[]>
> = {
  accepted_by_mechanic: ["en_route", "vehicle_received", "cancelled"],
  en_route: ["arrived", "cancelled"],
  vehicle_received: ["diagnosing", "cancelled"],
  arrived: ["diagnosing", "no_show_pending_review"],
  diagnosing: ["quote_submitted", "quote_pending_admin"],
  quote_pending_admin: ["quote_submitted"],
  quote_submitted: ["quote_approved", "quote_declined"],
  quote_approved: [
    "in_progress",
    "awaiting_parts_consent",
    "requote_submitted",
    "cancelled",
  ],
  awaiting_parts_consent: ["in_progress", "quote_approved", "cancelled"],
  quote_declined: ["cancelled"],
  requote_submitted: ["in_progress", "quote_approved", "cancelled"],
  in_progress: ["completed_pending_confirmation", "requote_submitted", "cancelled"],
  completed_pending_confirmation: ["confirmed", "disputed"],
  disputed: ["confirmed", "refunded"],
  no_show_pending_review: ["cancelled"],
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

/** Throws when `to` is not an allowed payment-phase successor of `from`. */
export function assertPaymentTransition(from: JobStatus, to: JobStatus): void {
  if (!isPaymentPhaseStatus(from)) {
    throw new InvalidJobTransitionError(from, to);
  }

  const allowed = PAYMENT_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}

/** Throws when `to` is not an allowed matching-phase successor of `from`. */
export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!isMatchingPhaseStatus(from)) {
    throw new InvalidJobTransitionError(from, to);
  }

  const allowed = MATCHING_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}

/** Throws when `to` is not an allowed service-phase successor of `from`. */
export function assertServiceTransition(from: JobStatus, to: JobStatus): void {
  if (!isServicePhaseStatus(from)) {
    throw new InvalidJobTransitionError(from, to);
  }

  const allowed = SERVICE_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}
