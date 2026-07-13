import { getAirtableClient } from "@/lib/airtable";
import { eq } from "@/lib/airtable/formula";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { AirtableRecord } from "@/types/airtable/common";
import type { DriverFields } from "@/types/airtable/drivers";

/** Look up a driver row by E.164 phone (`+1…`). Returns null when not found. */
export async function findDriverByPhone(
  phoneE164: string,
): Promise<AirtableRecord<DriverFields> | null> {
  const client = getAirtableClient();
  const formula = eq(FIELDS.Drivers.phone_number, phoneE164);

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
