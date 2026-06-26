import { getAirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { DiagnosisCategory, ServiceType } from "@/types/airtable/enums";
import type { JobFields } from "@/types/airtable/jobs";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { MECHANIC_ASSIGNMENT_COOLDOWN_MINUTES } from "./constants";

export function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export type MechanicPoolQuery = {
  zipCode: string;
  category?: DiagnosisCategory;
  serviceType?: ServiceType;
};

function serviceTypeClause(serviceType?: ServiceType): string {
  if (serviceType === "mobile_repair") {
    return "{mobile_available}=TRUE()";
  }
  if (serviceType === "dropoff") {
    return "{shop_available}=TRUE()";
  }
  return "";
}

export function zipClause(zipCode: string): string {
  const zip = escapeAirtableString(zipCode);
  return `FIND('${zip}', ARRAYJOIN({service_zip_codes}, ','))`;
}

function categoryClause(category: DiagnosisCategory): string {
  const value = escapeAirtableString(category);
  return `FIND('${value}', ARRAYJOIN({service_categories}, ','))`;
}

function cooldownClause(): string {
  return `OR({last_assigned_at}=BLANK(), IS_BEFORE({last_assigned_at}, DATEADD(NOW(), -${MECHANIC_ASSIGNMENT_COOLDOWN_MINUTES}, 'minutes')))`;
}

function joinClauses(clauses: string[]): string {
  const filtered = clauses.filter(Boolean);
  if (filtered.length === 0) {
    return "";
  }
  if (filtered.length === 1) {
    return filtered[0]!;
  }
  return `AND(${filtered.join(", ")})`;
}

/** §8.1 — Tier 1 pool formula (strict assignment). */
export function buildTier1Formula(query: MechanicPoolQuery): string {
  const clauses = [
    "{status}='approved'",
    "NOT({setup_wizard_completed_at}=BLANK())",
    "{availability_status}='available'",
    zipClause(query.zipCode),
    query.category ? categoryClause(query.category) : "",
    serviceTypeClause(query.serviceType),
    cooldownClause(),
  ];

  return joinClauses(clauses);
}

/** §8.1 — Tier 2 broadcast pool (available or recently busy, ZIP + category). */
export function buildTier2Formula(query: MechanicPoolQuery): string {
  const clauses = [
    "{status}='approved'",
    "NOT({setup_wizard_completed_at}=BLANK())",
    "OR({availability_status}='available', {availability_status}='busy')",
    zipClause(query.zipCode),
    query.category ? categoryClause(query.category) : "",
    serviceTypeClause(query.serviceType),
  ];

  return joinClauses(clauses);
}

/** §8.1 — Tier 3 broadcast pool (ZIP + available, no category filter). */
export function buildTier3Formula(query: MechanicPoolQuery): string {
  const clauses = [
    "{status}='approved'",
    "NOT({setup_wizard_completed_at}=BLANK())",
    "{availability_status}='available'",
    zipClause(query.zipCode),
    serviceTypeClause(query.serviceType),
  ];

  return joinClauses(clauses);
}

export function poolQueryFromJob(
  job: AirtableRecord<JobFields>,
): MechanicPoolQuery {
  return {
    zipCode: job.fields.zip_code ?? "",
    category: job.fields.diagnosis_category,
    serviceType: job.fields.service_type,
  };
}

/** Sort Tier 1 candidates: `last_assigned_at` ascending, nulls first. */
export function sortTier1Mechanics(
  mechanics: AirtableRecord<MechanicFields>[],
): AirtableRecord<MechanicFields>[] {
  return [...mechanics].sort((left, right) => {
    const leftAt = left.fields.last_assigned_at;
    const rightAt = right.fields.last_assigned_at;

    if (!leftAt && !rightAt) {
      return 0;
    }
    if (!leftAt) {
      return -1;
    }
    if (!rightAt) {
      return 1;
    }

    return new Date(leftAt).getTime() - new Date(rightAt).getTime();
  });
}

export async function listTier1Mechanics(
  query: MechanicPoolQuery,
): Promise<AirtableRecord<MechanicFields>[]> {
  if (!query.zipCode) {
    return [];
  }

  const client = getAirtableClient();
  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: buildTier1Formula(query),
  });

  return sortTier1Mechanics(response.records);
}

export async function listTier2Mechanics(
  query: MechanicPoolQuery,
): Promise<AirtableRecord<MechanicFields>[]> {
  if (!query.zipCode) {
    return [];
  }

  const client = getAirtableClient();
  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: buildTier2Formula(query),
  });

  return response.records;
}

export async function listTier3Mechanics(
  query: MechanicPoolQuery,
): Promise<AirtableRecord<MechanicFields>[]> {
  if (!query.zipCode) {
    return [];
  }

  const client = getAirtableClient();
  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: buildTier3Formula(query),
  });

  return response.records;
}
