import { getAirtableClient } from "@/lib/airtable";
import { and, eq, findInJoin, or } from "@/lib/airtable/formula";
import { FIELDS } from "@/types/airtable/generated/fields";
import { findDriverByPhone } from "@/lib/drivers/lookup";
import { findMechanicByPhone } from "@/lib/mechanics/lookup";
import { parseMechanicZipCodes } from "@/lib/mechanics/zip-codes";
import {
  getMatchTier,
  isQuoteSubmitted,
  isRequoteSubmitted,
  JOB_STATUS,
} from "@/lib/jobs/status";
import { normalizeServiceCategory } from "@/lib/mechanics/normalize-categories";
import { normalizeUsPhone } from "@/lib/phone";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import { ACTIVE_SERVICE_STATUSES } from "./transitions";

/** Fetch a job row by Airtable record ID. */
export async function getJobById(
  recordId: string,
): Promise<AirtableRecord<JobFields>> {
  const client = getAirtableClient();
  return client.getRecord<JobFields>("jobs", recordId);
}

export async function findPendingJobForMechanic(
  phone: string,
): Promise<AirtableRecord<JobFields> | null> {
  const phoneE164 = normalizeUsPhone(phone);
  const mechanic = await findMechanicByPhone(phoneE164);
  if (!mechanic) {
    return null;
  }

  const client = getAirtableClient();
  const mechanicId = mechanic.id;

  const tier1 = await client.listRecords<JobFields>("jobs", {
    filterByFormula: and(
      eq(FIELDS.Jobs.status, JOB_STATUS.matched_awaiting_response),
      eq(FIELDS.Jobs.match_tier, 1),
      findInJoin(FIELDS.Jobs.mechanic_id, mechanicId),
    ),
    maxRecords: 1,
    sort: [{ field: FIELDS.Jobs.match_tier_started_at, direction: "desc" }],
  });

  if (tier1.records[0]) {
    return tier1.records[0];
  }

  const broadcast = await client.listRecords<JobFields>("jobs", {
    filterByFormula: and(
      eq(FIELDS.Jobs.status, JOB_STATUS.matched_awaiting_response),
      or(eq(FIELDS.Jobs.match_tier, 2), eq(FIELDS.Jobs.match_tier, 3)),
    ),
    sort: [{ field: FIELDS.Jobs.match_tier_started_at, direction: "desc" }],
  });

  const zips = new Set(parseMechanicZipCodes(mechanic.fields.service_zip_codes));
  const categories = new Set(
    (mechanic.fields.service_categories ?? []).map(normalizeServiceCategory),
  );

  for (const job of broadcast.records) {
    const zip = job.fields.zip_code;
    if (!zip || !zips.has(zip)) {
      continue;
    }

    if (getMatchTier(job) === 2) {
      const category = job.fields.diagnosis_category;
      if (!category || !categories.has(normalizeServiceCategory(category))) {
        continue;
      }
    }

    return job;
  }

  return null;
}

function buildStatusOrFormula(statuses: readonly string[]): string {
  if (statuses.length === 1) {
    return eq(FIELDS.Jobs.status, statuses[0]!);
  }
  return or(...statuses.map((status) => eq(FIELDS.Jobs.status, status)));
}

export async function findActiveJobForMechanic(
  phone: string,
): Promise<AirtableRecord<JobFields> | null> {
  const phoneE164 = normalizeUsPhone(phone);
  const mechanic = await findMechanicByPhone(phoneE164);
  if (!mechanic) {
    return null;
  }

  const client = getAirtableClient();
  const statusFilter = buildStatusOrFormula(ACTIVE_SERVICE_STATUSES);

  const response = await client.listRecords<JobFields>("jobs", {
    filterByFormula: and(
      statusFilter,
      findInJoin(FIELDS.Jobs.mechanic_id, mechanic.id),
    ),
    maxRecords: 1,
    sort: [{ field: FIELDS.Jobs.created_at, direction: "desc" }],
  });

  return response.records[0] ?? null;
}

export async function findJobAwaitingDriverResponse(
  phone: string,
): Promise<AirtableRecord<JobFields> | null> {
  const phoneE164 = normalizeUsPhone(phone);
  const driver = await findDriverByPhone(phoneE164);
  if (!driver) {
    return null;
  }

  const client = getAirtableClient();
  const statusFilter = buildStatusOrFormula([
    JOB_STATUS.awaiting_customer_approval,
    JOB_STATUS.completed_pending_confirmation,
    JOB_STATUS.quote_provided,
  ]);

  const response = await client.listRecords<JobFields>("jobs", {
    filterByFormula: and(
      statusFilter,
      findInJoin(FIELDS.Jobs.driver_id, driver.id),
    ),
    maxRecords: 5,
    sort: [{ field: FIELDS.Jobs.created_at, direction: "desc" }],
  });

  return (
    response.records.find(
      (job) => isQuoteSubmitted(job.fields) || isRequoteSubmitted(job.fields),
    ) ?? response.records[0] ?? null
  );
}
