/** Minutes a mechanic must wait after assignment before Tier 1 eligibility (§8.1). */
export const MECHANIC_ASSIGNMENT_COOLDOWN_MINUTES = 15;

/**
 * Seconds from `matched_at` when each escalation fires (§6.1).
 * Tier 2: +10 min, Tier 3: +25 min total, Tier 4: +55 min total.
 */
export const DEFAULT_TIER_DELAYS_SECONDS = {
  tier2: 600,
  tier3: 1500,
  tier4: 3300,
} as const;

export type TierDelaysSeconds = {
  tier2: number;
  tier3: number;
  tier4: number;
};

export const MATCH_ESCALATE_PATH = "/api/jobs/match/escalate";

/**
 * Optional local override: `MATCHING_TIER_DELAYS_SECONDS=60,120,180`
 * (tier2, tier3, tier4 delays in seconds from `matched_at`).
 */
export function getTierDelaysSeconds(): TierDelaysSeconds {
  const raw = process.env.MATCHING_TIER_DELAYS_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_TIER_DELAYS_SECONDS;
  }

  const parts = raw.split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (
    parts.length !== 3 ||
    parts.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    console.warn(
      "[matching] Invalid MATCHING_TIER_DELAYS_SECONDS; using defaults:",
      raw,
    );
    return DEFAULT_TIER_DELAYS_SECONDS;
  }

  return {
    tier2: parts[0]!,
    tier3: parts[1]!,
    tier4: parts[2]!,
  };
}
