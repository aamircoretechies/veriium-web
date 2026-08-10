import { createMechanicAvailabilityInactiveActionItem } from "@/lib/action-items/create";
import { getAirtableClient } from "@/lib/airtable";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { updateMechanicSchema } from "@/types/airtable/schemas";
import { availabilityIsStale } from "./availability-freshness";
import { getMechanicById } from "./lookup";

export type StaleCheckResult = {
  mechanicId: string;
  skipped?: boolean;
  reason?: string;
  action?: "marked_stale";
};

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
    availability_status: "offline",
  });
  const client = getAirtableClient();

  await client.updateRecord<MechanicFields>(
    "mechanics",
    mechanicId,
    fields as Partial<MechanicFields>,
    { typecast: true },
  );

  try {
    await createMechanicAvailabilityInactiveActionItem({
      mechanicId,
      mechanicName: mechanic.fields.name,
    });
  } catch (error) {
    console.error(
      `[mechanics/stale-check] Failed to create action item for ${mechanicId}:`,
      error,
    );
  }

  return { mechanicId, action: "marked_stale" };
}
