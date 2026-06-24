import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";

export type JobSmsContext = {
  jobId: string;
  zipCode: string;
  categoryLabel?: string;
  vehicleLabel?: string;
  serviceTypeLabel?: string;
};

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

/** Build SMS template context from a job row. */
export function buildJobSmsContext(
  job: AirtableRecord<JobFields>,
): JobSmsContext {
  const { vehicle_year: year, vehicle_make: make, vehicle_model: model } =
    job.fields;

  const vehicleParts = [year, make, model].filter(
    (part) => part !== undefined && part !== "",
  );
  const vehicleLabel =
    vehicleParts.length > 0 ? vehicleParts.join(" ") : undefined;

  const category = job.fields.diagnosis_category;
  const categoryLabel = category ? CATEGORY_LABELS[category] ?? category : undefined;

  const serviceTypeLabel =
    job.fields.service_type === "mobile_repair"
      ? "Mobile repair"
      : job.fields.service_type === "dropoff"
        ? "Shop drop-off"
        : undefined;

  return {
    jobId: job.id,
    zipCode: job.fields.zip_code ?? "unknown",
    categoryLabel,
    vehicleLabel,
    serviceTypeLabel,
  };
}
