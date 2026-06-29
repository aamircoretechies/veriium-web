import { getAirtableClient } from "@/lib/airtable";
import { findDriverByPhone } from "@/lib/drivers/lookup";
import { findMechanicByPhone } from "@/lib/mechanics/lookup";
import { normalizeUsPhone } from "@/lib/phone";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import { ACTIVE_SERVICE_STATUSES } from "./transitions";

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

function buildStatusOrFormula(statuses: readonly string[]): string {
  if (statuses.length === 1) {
    return `{status}='${escapeAirtableString(statuses[0])}'`;
  }

  return `OR(${statuses.map((status) => `{status}='${escapeAirtableString(status)}'`).join(", ")})`;
}

/**
 * Find the mechanic's active in-service job (`accepted_by_mechanic` … `in_progress`).
 */
export async function findActiveJobForMechanic(
  phone: string,
): Promise<AirtableRecord<JobFields> | null> {
  const phoneE164 = normalizeUsPhone(phone);
  const mechanic = await findMechanicByPhone(phoneE164);
  if (!mechanic) {
    return null;
  }

  const client = getAirtableClient();
  const mechanicId = escapeAirtableString(mechanic.id);
  const statusFilter = buildStatusOrFormula(ACTIVE_SERVICE_STATUSES);

  const response = await client.listRecords<JobFields>("jobs", {
    filterByFormula: `AND(${statusFilter}, FIND('${mechanicId}', ARRAYJOIN({mechanic}, ',')))`,
    maxRecords: 1,
    sort: [{ field: "accepted_at", direction: "desc" }],
  });

  return response.records[0] ?? null;
}

/**
 * Find a job awaiting a driver SMS reply (quote APPROVE/DECLINE or confirm/dispute).
 */
export async function findJobAwaitingDriverResponse(
  phone: string,
): Promise<AirtableRecord<JobFields> | null> {
  const phoneE164 = normalizeUsPhone(phone);
  const driver = await findDriverByPhone(phoneE164);
  if (!driver) {
    return null;
  }

  const client = getAirtableClient();
  const driverId = escapeAirtableString(driver.id);
  const statusFilter = buildStatusOrFormula([
    "awaiting_parts_consent",
    "completed_pending_confirmation",
    "quote_submitted",
    "requote_submitted",
  ]);

  const response = await client.listRecords<JobFields>("jobs", {
    filterByFormula: `AND(${statusFilter}, FIND('${driverId}', ARRAYJOIN({driver}, ',')))`,
    maxRecords: 1,
    sort: [{ field: "requote_submitted_at", direction: "desc" }],
  });

  return response.records[0] ?? null;
}
