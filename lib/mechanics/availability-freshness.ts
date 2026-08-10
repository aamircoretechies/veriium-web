import { and, notBlank } from "@/lib/airtable/formula";
import { getStaleAvailabilitySeconds } from "@/lib/edge/constants";
import { FIELDS } from "@/types/airtable/generated/fields";

/** True when `availability_updated_at` is missing or older than the stale threshold (§4.8). */
export function availabilityIsStale(updatedAt?: string): boolean {
  if (!updatedAt) {
    return true;
  }

  const elapsedMs = Date.now() - new Date(updatedAt).getTime();
  return elapsedMs >= getStaleAvailabilitySeconds() * 1000;
}

/** True when `availability_updated_at` is present and within the stale threshold. */
export function availabilityIsFresh(updatedAt?: string): boolean {
  return !availabilityIsStale(updatedAt);
}

/** Airtable formula clause — mirrors `availabilityIsFresh` for pool queries. */
export function buildFreshAvailabilityFormulaClause(): string {
  return and(
    notBlank(FIELDS.Mechanics.availability_updated_at),
    `IS_AFTER({availability_updated_at}, DATEADD(NOW(), -${getStaleAvailabilitySeconds()}, 'seconds'))`,
  );
}
