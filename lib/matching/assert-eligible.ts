import { availabilityIsFresh } from "@/lib/mechanics/availability-freshness";
import { getMechanicById } from "@/lib/mechanics/lookup";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

export type MatchSendTier = 1 | 2 | 3;

/** §4.8 send-time availability check — availability only (pool query gates other criteria). */
export function isMechanicEligibleForTierSend(
  mechanic: AirtableRecord<MechanicFields>,
  tier: MatchSendTier,
): boolean {
  const { fields } = mechanic;
  const status = fields.availability_status ?? "offline";
  const fresh = availabilityIsFresh(fields.availability_updated_at);

  if (tier === 2) {
    return status === "busy" || (status === "available" && fresh);
  }

  return status === "available" && fresh;
}

/** Re-fetch mechanic and return the record only if still eligible for the tier send. */
export async function refetchMechanicIfEligible(
  mechanicId: string,
  tier: MatchSendTier,
): Promise<AirtableRecord<MechanicFields> | null> {
  const mechanic = await getMechanicById(mechanicId);

  if (!isMechanicEligibleForTierSend(mechanic, tier)) {
    return null;
  }

  return mechanic;
}
