import type { JobStatus } from "@/types/airtable/enums";

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
  Record<MatchingPhaseStatus, readonly MatchingPhaseStatus[]>
> = {
  matched: ["accepted_by_mechanic", "matched_tier2"],
  matched_tier2: ["accepted_by_mechanic", "matched_tier3"],
  matched_tier3: ["accepted_by_mechanic", "awaiting_admin_match"],
  awaiting_admin_match: ["matched"],
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

/** Throws when `to` is not an allowed matching-phase successor of `from`. */
export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!isMatchingPhaseStatus(from)) {
    throw new InvalidJobTransitionError(from, to);
  }

  const allowed = MATCHING_TRANSITIONS[from];
  if (!allowed?.includes(to as MatchingPhaseStatus)) {
    throw new InvalidJobTransitionError(from, to);
  }
}
