import { getAirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { DriverFields } from "@/types/airtable/drivers";

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Look up a driver row by E.164 phone (`+1…`). Returns null when not found. */
export async function findDriverByPhone(
  phoneE164: string,
): Promise<AirtableRecord<DriverFields> | null> {
  const client = getAirtableClient();
  const formula = `{phone} = '${escapeAirtableString(phoneE164)}'`;

  const response = await client.listRecords<DriverFields>("drivers", {
    filterByFormula: formula,
    maxRecords: 1,
  });

  return response.records[0] ?? null;
}

/** Fetch a driver row by Airtable record ID. */
export async function getDriverById(
  recordId: string,
): Promise<AirtableRecord<DriverFields>> {
  const client = getAirtableClient();
  return client.getRecord<DriverFields>("drivers", recordId);
}
