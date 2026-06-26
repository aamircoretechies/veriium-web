import { escapeAirtableString, zipClause } from "@/lib/matching/query";
import { uiServiceToDiagnosisCategory } from "@/lib/mechanics/map-categories";
import type { MechanicSearchQuery } from "@/types/api/mechanic-search";
import type { DiagnosisCategory } from "@/types/airtable/enums";

function categoryClause(category: DiagnosisCategory): string {
  const value = escapeAirtableString(category);
  return `FIND('${value}', ARRAYJOIN({service_categories}, ','))`;
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

function serviceTypeClause(
  serviceType: MechanicSearchQuery["serviceType"],
): string {
  if (serviceType === "mobile") {
    return "{mobile_available}=TRUE()";
  }
  if (serviceType === "shop") {
    return "{shop_available}=TRUE()";
  }
  return "";
}

/** Public browse pool — approved mechanics with completed setup (no cooldown filter). */
export function buildMechanicSearchFormula(query: MechanicSearchQuery): string {
  const clauses = [
    "{status}='approved'",
    "NOT({setup_wizard_completed_at}=BLANK())",
    query.zip ? zipClause(query.zip) : "",
    query.aseCertifiedOnly ? "{ase_certified}=TRUE()" : "",
    serviceTypeClause(query.serviceType),
    query.availableTodayOnly ? "{availability_status}='available'" : "",
    ...query.services.map((uiService) => {
      const category = uiServiceToDiagnosisCategory(uiService);
      return category ? categoryClause(category) : "";
    }),
  ];

  return joinClauses(clauses);
}
