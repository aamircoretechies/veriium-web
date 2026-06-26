import type { MechanicServiceKey } from "@/types/api/mechanic-search";
import type { DiagnosisCategory } from "@/types/airtable/enums";

/** UI checkbox keys from ApplyAsMechanic → Airtable `service_categories` values. */
const SERVICE_KEY_TO_CATEGORY: Record<MechanicServiceKey, DiagnosisCategory> = {
  engine: "engine_diagnostics",
  brakes: "brakes",
  suspension: "suspension_steering",
  electrical: "electrical",
  diagnostics: "engine_diagnostics",
  general: "general_maintenance",
  other: "unknown",
};

/** One Airtable category can surface multiple Find Mechanic UI service badges. */
const CATEGORY_TO_UI_SERVICES: Record<DiagnosisCategory, MechanicServiceKey[]> = {
  battery_starting: [],
  brakes: ["brakes"],
  oil_maintenance: [],
  engine_diagnostics: ["engine", "diagnostics"],
  transmission: [],
  tires_wheels: [],
  electrical: ["electrical"],
  ac_heating: [],
  suspension_steering: ["suspension"],
  exhaust: [],
  fuel_system: [],
  general_maintenance: ["general"],
  unknown: ["other"],
};

/** Map a Find Mechanic UI service key to an Airtable `service_categories` value. */
export function uiServiceToDiagnosisCategory(
  uiService: string,
): DiagnosisCategory | undefined {
  return SERVICE_KEY_TO_CATEGORY[uiService];
}

/** UI service badge keys for a stored diagnosis category. */
export function diagnosisCategoryToUiServices(
  category: DiagnosisCategory,
): MechanicServiceKey[] {
  return CATEGORY_TO_UI_SERVICES[category] ?? [];
}

/** Deduped UI service keys from a mechanic's `service_categories`. */
export function mapCategoriesToUiServices(
  categories: DiagnosisCategory[] | undefined,
): MechanicServiceKey[] {
  if (!categories?.length) {
    return [];
  }

  const services = new Set<MechanicServiceKey>();
  for (const category of categories) {
    for (const key of diagnosisCategoryToUiServices(category)) {
      services.add(key);
    }
  }

  return [...services];
}

/**
 * Map checked service checkbox keys to `DiagnosisCategory[]` (deduped).
 * Unknown keys are ignored.
 */
export function mapServiceCategories(
  services: Record<string, boolean>,
): DiagnosisCategory[] {
  const categories = new Set<DiagnosisCategory>();

  for (const [key, checked] of Object.entries(services)) {
    if (!checked) {
      continue;
    }
    const category = uiServiceToDiagnosisCategory(key);
    if (category) {
      categories.add(category);
    }
  }

  return [...categories];
}
