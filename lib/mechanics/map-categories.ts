import type { DiagnosisCategory } from "@/types/airtable/enums";

/** UI checkbox keys from ApplyAsMechanic → Airtable `service_categories` values. */
const SERVICE_KEY_TO_CATEGORY: Record<string, DiagnosisCategory> = {
  engine: "engine_diagnostics",
  brakes: "brakes",
  suspension: "suspension_steering",
  electrical: "electrical",
  diagnostics: "engine_diagnostics",
  general: "general_maintenance",
  other: "unknown",
};

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
    const category = SERVICE_KEY_TO_CATEGORY[key];
    if (category) {
      categories.add(category);
    }
  }

  return [...categories];
}
