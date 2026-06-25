import { getAirtableClient } from "@/lib/airtable";
import { getStaleAvailabilitySeconds } from "@/lib/edge/constants";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { updateMechanicSchema } from "@/types/airtable/schemas";
import { getMechanicById } from "./lookup";

export type StaleCheckResult = {
  mechanicId: string;
  skipped?: boolean;
  reason?: string;
  action?: "marked_stale";
};

function availabilityIsStale(updatedAt: string | undefined): boolean {
  if (!updatedAt) {
    return true;
  }

  const elapsedMs = Date.now() - new Date(updatedAt).getTime();
  return elapsedMs >= getStaleAvailabilitySeconds() * 1000;
}

/**
 * QStash worker — mark mechanic `stale` when availability was not refreshed (§4.8).
 * Idempotent no-op when status is not `available` or timestamp was updated recently.
 */
export async function runStaleAvailabilityCheck(
  mechanicId: string,
): Promise<StaleCheckResult> {
  const mechanic = await getMechanicById(mechanicId);

  if (mechanic.fields.availability_status !== "available") {
    return { mechanicId, skipped: true, reason: "not_available" };
  }

  if (!availabilityIsStale(mechanic.fields.availability_updated_at)) {
    return { mechanicId, skipped: true, reason: "availability_refreshed" };
  }

  const fields = updateMechanicSchema.parse({
    availability_status: "stale",
  });
  const client = getAirtableClient();

  await client.updateRecord<MechanicFields>("mechanics", mechanicId, fields, {
    typecast: true,
  });

  return { mechanicId, action: "marked_stale" };
}
