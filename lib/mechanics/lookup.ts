import { getAirtableClient } from "@/lib/airtable";
import { eq } from "@/lib/airtable/formula";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

/** Look up a mechanic row by E.164 phone (`+1…`). Returns null when not found. */
export async function findMechanicByPhone(
  phoneE164: string,
): Promise<AirtableRecord<MechanicFields> | null> {
  const client = getAirtableClient();
  const formula = eq(FIELDS.Mechanics.phone_number, phoneE164);

  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Fetch a mechanic row by Airtable record ID. */
export async function getMechanicById(
  recordId: string,
): Promise<AirtableRecord<MechanicFields>> {
  const client = getAirtableClient();
  return client.getRecord<MechanicFields>("mechanics", recordId);
}
