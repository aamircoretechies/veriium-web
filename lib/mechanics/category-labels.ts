import type { ServiceCategoryCanonical } from "@/types/airtable/enums";

const CATEGORY_LABELS: Record<string, string> = {
  battery_starting: "Battery / Starting",
  brakes: "Brakes",
  oil_maintenance: "Oil & Maintenance",
  engine_diagnostics: "Engine Diagnostics",
  transmission: "Transmission",
  tires_wheels: "Tires & Wheels",
  electrical: "Electrical",
  ac_heating: "A/C & Heating",
  suspension_steering: "Suspension & Steering",
  exhaust: "Exhaust",
  fuel_system: "Fuel System",
  general_maintenance: "General Maintenance",
  unknown: "General Repair",
};

export function formatServiceCategoryLabel(
  category: ServiceCategoryCanonical | string,
): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function formatServiceCategoryLabels(
  categories: ServiceCategoryCanonical[],
): string[] {
  return [...new Set(categories.map(formatServiceCategoryLabel))];
}
