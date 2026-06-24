import { getAirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { updateMechanicSchema } from "@/types/airtable/schemas";

/** Record a Tier 1 assignment timestamp without changing availability. */
export async function markMechanicAssigned(
  mechanicId: string,
): Promise<AirtableRecord<MechanicFields>> {
  const now = new Date().toISOString();
  const fields = updateMechanicSchema.parse({ last_assigned_at: now });
  const client = getAirtableClient();

  return client.updateRecord<MechanicFields>("mechanics", mechanicId, fields, {
    typecast: true,
  });
}

/** Mark mechanic busy after ACCEPT / YES (§8.1). */
export async function markMechanicBusy(
  mechanicId: string,
): Promise<AirtableRecord<MechanicFields>> {
  const now = new Date().toISOString();
  const fields = updateMechanicSchema.parse({
    availability_status: "busy",
    last_assigned_at: now,
  });
  const client = getAirtableClient();

  return client.updateRecord<MechanicFields>("mechanics", mechanicId, fields, {
    typecast: true,
  });
}
