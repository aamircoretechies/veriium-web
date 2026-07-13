import { eq, notBlank } from "@/lib/airtable/formula";
import { zipClause } from "@/lib/matching/query";
import { uiServiceToDiagnosisCategory } from "@/lib/mechanics/map-categories";
import { serviceCategoryMatchClause } from "@/lib/mechanics/normalize-categories";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { MechanicSearchQuery } from "@/types/api/mechanic-search";

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

function serviceTypeClause(
  serviceType: MechanicSearchQuery["serviceType"],
): string {
  if (serviceType === "mobile") {
    return notBlank(FIELDS.Mechanics.phone_number);
  }
  if (serviceType === "shop") {
    return notBlank(FIELDS.Mechanics.shop_address);
  }
  return "";
}

export function buildMechanicSearchFormula(query: MechanicSearchQuery): string {
  const clauses = [
    eq(FIELDS.Mechanics.approved, true),
    notBlank(FIELDS.Mechanics.profile_photo_url),
    notBlank(FIELDS.Mechanics.service_zip_codes),
    query.zip ? zipClause(query.zip) : "",
    query.aseCertifiedOnly
      ? eq(FIELDS.Mechanics.certified_status, "certified")
      : "",
    serviceTypeClause(query.serviceType),
    query.availableTodayOnly
      ? eq(FIELDS.Mechanics.availability_status, "available")
      : "",
    ...query.services.map((uiService) => {
      const category = uiServiceToDiagnosisCategory(uiService);
      return category ? serviceCategoryMatchClause(category) : "";
    }),
  ];

  return joinClauses(clauses);
}
