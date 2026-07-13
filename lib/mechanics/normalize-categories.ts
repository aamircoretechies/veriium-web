import { findInJoin, or } from "@/lib/airtable/formula";
import { FIELDS } from "@/types/airtable/generated/fields";
import type { MechanicsServiceCategories } from "@/types/airtable/generated/enums";
import {
  SERVICE_CATEGORIES_CANONICAL,
  SERVICE_CATEGORIES_LEGACY,
  type DiagnosisCategory,
  type ServiceCategoryCanonical,
  type ServiceCategoryLegacy,
} from "@/types/airtable/enums";

const LEGACY_TO_CANONICAL: Record<ServiceCategoryLegacy, ServiceCategoryCanonical> =
  {
    "Engine Repair": "engine_diagnostics",
    Brakes: "brakes",
    Diagnostics: "engine_diagnostics",
    Transmission: "transmission",
    "Electrical Systems": "electrical",
    Suspension: "suspension_steering",
    "Hybrid Systems": "general_maintenance",
    "Oil Change": "oil_maintenance",
    "Air Conditioning": "ac_heating",
  };

const CANONICAL_TO_LEGACY: Partial<
  Record<ServiceCategoryCanonical, ServiceCategoryLegacy[]>
> = {};
for (const legacy of SERVICE_CATEGORIES_LEGACY) {
  const canonical = LEGACY_TO_CANONICAL[legacy];
  const bucket = CANONICAL_TO_LEGACY[canonical] ?? [];
  bucket.push(legacy);
  CANONICAL_TO_LEGACY[canonical] = bucket;
}

export function normalizeServiceCategory(
  value: MechanicsServiceCategories | string,
): ServiceCategoryCanonical {
  if (
    (SERVICE_CATEGORIES_CANONICAL as readonly string[]).includes(value)
  ) {
    return value as ServiceCategoryCanonical;
  }

  if (value in LEGACY_TO_CANONICAL) {
    return LEGACY_TO_CANONICAL[value as ServiceCategoryLegacy];
  }

  return "general_maintenance";
}

export function normalizeServiceCategories(
  values: MechanicsServiceCategories[] | undefined,
): ServiceCategoryCanonical[] {
  if (!values?.length) return [];
  return [...new Set(values.map(normalizeServiceCategory))];
}

/** Canonical value plus legacy Airtable aliases that map to it (for filter formulas). */
export function serviceCategoryMatchValues(
  category: DiagnosisCategory,
): string[] {
  if (category === "unknown") {
    return [];
  }
  const legacy = CANONICAL_TO_LEGACY[category as ServiceCategoryCanonical] ?? [];
  return [category, ...legacy];
}

/** Match mechanics with canonical or legacy `service_categories` values. */
export function serviceCategoryMatchClause(category: DiagnosisCategory): string {
  const values = serviceCategoryMatchValues(category);
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return findInJoin(FIELDS.Mechanics.service_categories, values[0]!);
  }
  return or(
    ...values.map((value) =>
      findInJoin(FIELDS.Mechanics.service_categories, value),
    ),
  );
}

export { SERVICE_CATEGORIES_LEGACY };
