import { getAirtableClient } from "@/lib/airtable";
import { and, eq, findInJoin, isBlank, notBlank, or } from "@/lib/airtable/formula";
import { serviceCategoryMatchClause } from "@/lib/mechanics/normalize-categories";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { AirtableRecord } from "@/types/airtable/common";
import type { DiagnosisCategory, ServiceType } from "@/types/airtable/enums";
import type { JobFields } from "@/types/airtable/jobs";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { MECHANIC_ASSIGNMENT_COOLDOWN_MINUTES } from "./constants";

export type MechanicPoolQuery = {
  zipCode: string;
  category?: DiagnosisCategory;
  serviceType?: ServiceType;
};

function serviceTypeClause(serviceType?: ServiceType): string {
  if (serviceType === "mobile_repair") {
    return notBlank(FIELDS.Mechanics.phone_number);
  }
  if (serviceType === "dropoff") {
    return notBlank(FIELDS.Mechanics.shop_address);
  }
  return "";
}

export function zipClause(zipCode: string): string {
  return findInJoin(FIELDS.Mechanics.service_zip_codes, zipCode);
}

function cooldownClause(): string {
  return `OR(${isBlank(FIELDS.Mechanics.last_assigned_at)}, IS_BEFORE({last_assigned_at}, DATEADD(NOW(), -${MECHANIC_ASSIGNMENT_COOLDOWN_MINUTES}, 'minutes')))`;
}

function joinClauses(clauses: string[]): string {
  const filtered = clauses.filter(Boolean);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0]!;
  return and(...filtered);
}

function approvedMechanicClauses(): string[] {
  return [
    eq(FIELDS.Mechanics.approved, true),
    eq(FIELDS.Mechanics.background_check_status, "cleared"),
    notBlank(FIELDS.Mechanics.profile_photo_url),
    notBlank(FIELDS.Mechanics.service_zip_codes),
  ];
}

export function buildTier1Formula(query: MechanicPoolQuery): string {
  return joinClauses([
    ...approvedMechanicClauses(),
    eq(FIELDS.Mechanics.availability_status, "available"),
    zipClause(query.zipCode),
    query.category ? serviceCategoryMatchClause(query.category) : "",
    serviceTypeClause(query.serviceType),
    cooldownClause(),
  ]);
}

export function buildTier2Formula(query: MechanicPoolQuery): string {
  return joinClauses([
    ...approvedMechanicClauses(),
    or(
      eq(FIELDS.Mechanics.availability_status, "available"),
      eq(FIELDS.Mechanics.availability_status, "busy"),
    ),
    zipClause(query.zipCode),
    query.category ? serviceCategoryMatchClause(query.category) : "",
    serviceTypeClause(query.serviceType),
  ]);
}

export function buildTier3Formula(query: MechanicPoolQuery): string {
  return joinClauses([
    ...approvedMechanicClauses(),
    eq(FIELDS.Mechanics.availability_status, "available"),
    zipClause(query.zipCode),
    serviceTypeClause(query.serviceType),
  ]);
}

export function poolQueryFromJob(
  job: AirtableRecord<JobFields>,
): MechanicPoolQuery {
  return {
    zipCode: job.fields.zip_code ?? "",
    category: job.fields.diagnosis_category as DiagnosisCategory | undefined,
    serviceType: job.fields.service_type,
  };
}

export function sortTier1Mechanics(
  mechanics: AirtableRecord<MechanicFields>[],
): AirtableRecord<MechanicFields>[] {
  return [...mechanics].sort((left, right) => {
    const leftAt = left.fields.last_assigned_at;
    const rightAt = right.fields.last_assigned_at;

    if (!leftAt && !rightAt) return 0;
    if (!leftAt) return -1;
    if (!rightAt) return 1;

    return new Date(leftAt).getTime() - new Date(rightAt).getTime();
  });
}

export async function listTier1Mechanics(
  query: MechanicPoolQuery,
): Promise<AirtableRecord<MechanicFields>[]> {
  if (!query.zipCode) return [];

  const client = getAirtableClient();
  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: buildTier1Formula(query),
  });

  return sortTier1Mechanics(response.records);
}

export async function listTier2Mechanics(
  query: MechanicPoolQuery,
): Promise<AirtableRecord<MechanicFields>[]> {
  if (!query.zipCode) return [];

  const client = getAirtableClient();
  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: buildTier2Formula(query),
  });

  return response.records;
}

export async function listTier3Mechanics(
  query: MechanicPoolQuery,
): Promise<AirtableRecord<MechanicFields>[]> {
  if (!query.zipCode) return [];

  const client = getAirtableClient();
  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: buildTier3Formula(query),
  });

  return response.records;
}
