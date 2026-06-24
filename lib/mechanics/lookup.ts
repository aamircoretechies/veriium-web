import { getAirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Look up a mechanic row by E.164 phone (`+1…`). Returns null when not found. */
export async function findMechanicByPhone(
  phoneE164: string,
): Promise<AirtableRecord<MechanicFields> | null> {
  const client = getAirtableClient();
  const formula = `{phone} = '${escapeAirtableString(phoneE164)}'`;

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
