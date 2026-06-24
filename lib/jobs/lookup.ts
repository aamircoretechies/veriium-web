import { getAirtableClient } from "@/lib/airtable";
import { findMechanicByPhone } from "@/lib/mechanics/lookup";
import { normalizeUsPhone } from "@/lib/phone";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Fetch a job row by Airtable record ID. */
export async function getJobById(
  recordId: string,
): Promise<AirtableRecord<JobFields>> {
  const client = getAirtableClient();
  return client.getRecord<JobFields>("jobs", recordId);
}

/**
 * Find the open matching-phase job a mechanic should respond to (ACCEPT / DECLINE / YES).
 *
 * Priority: Tier 1 assignment (`matched` + linked mechanic), then Tier 2/3 broadcast
 * pools filtered by service ZIP (+ category for Tier 2).
 */
export async function findPendingJobForMechanic(
  phone: string,
): Promise<AirtableRecord<JobFields> | null> {
  const phoneE164 = normalizeUsPhone(phone);
  const mechanic = await findMechanicByPhone(phoneE164);
  if (!mechanic) {
    return null;
  }

  const client = getAirtableClient();
  const mechanicId = escapeAirtableString(mechanic.id);

  const tier1 = await client.listRecords<JobFields>("jobs", {
    filterByFormula: `AND({status}='matched', FIND('${mechanicId}', ARRAYJOIN({mechanic}, ',')))`,
    maxRecords: 1,
    sort: [{ field: "matched_at", direction: "desc" }],
  });

  if (tier1.records[0]) {
    return tier1.records[0];
  }

  const broadcast = await client.listRecords<JobFields>("jobs", {
    filterByFormula: `OR({status}='matched_tier2', {status}='matched_tier3')`,
    sort: [{ field: "matched_at", direction: "desc" }],
  });

  const zips = new Set(mechanic.fields.service_zip_codes ?? []);
  const categories = new Set(mechanic.fields.service_categories ?? []);

  for (const job of broadcast.records) {
    const zip = job.fields.zip_code;
    if (!zip || !zips.has(zip)) {
      continue;
    }

    if (job.fields.status === "matched_tier2") {
      const category = job.fields.diagnosis_category;
      if (!category || !categories.has(category)) {
        continue;
      }
    }

    return job;
  }

  return null;
}
