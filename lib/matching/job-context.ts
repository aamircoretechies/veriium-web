import { formatServiceCategoryLabel } from "@/lib/mechanics/category-labels";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";

export type JobSmsContext = {
  jobId: string;
  zipCode: string;
  categoryLabel?: string;
  vehicleLabel?: string;
  serviceTypeLabel?: string;
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
  const categoryLabel = category
    ? formatServiceCategoryLabel(category)
    : undefined;

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
