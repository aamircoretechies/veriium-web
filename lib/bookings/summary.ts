import { AirtableError, getAirtableClient } from "@/lib/airtable";
import { buildSignedJobUrl } from "@/lib/auth/signed-url";
import { getJobById } from "@/lib/jobs/lookup";
import { jobStatusOr } from "@/lib/jobs/status";
import { getMechanicById } from "@/lib/mechanics/lookup";
import type { BookingSummary } from "@/types/api/booking-summary";
import type { DiagnosisFields } from "@/types/airtable/diagnoses";
import type {
  DiagnosisCategory,
  Driveability,
  FixNowVsWait,
} from "@/types/airtable/enums";

export class BookingNotFoundError extends Error {
  constructor(message = "Booking not found.") {
    super(message);
    this.name = "BookingNotFoundError";
  }
}

function asDiagnosisCategory(
  value: DiagnosisFields["ai_response_category"],
): DiagnosisCategory | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "suspension_steerting") {
    return "suspension_steering";
  }
  return value as DiagnosisCategory;
}

function asDriveability(
  value: DiagnosisFields["ai_response_driveability"],
): Driveability | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "safe" || value === "caution" || value === "do_not_drive") {
    return value;
  }
  return undefined;
}

function parseCostEstimate(raw?: string): {
  low?: number;
  high?: number;
} {
  if (!raw?.trim()) {
    return {};
  }

  const [lowText, highText] = raw.split("-").map((part) => part.trim());
  const low = Number.parseInt(lowText ?? "", 10);
  const high = Number.parseInt(highText ?? "", 10);

  return {
    ...(Number.isFinite(low) ? { low } : {}),
    ...(Number.isFinite(high) ? { high } : {}),
  };
}

function parseDiagnosisPayload(raw?: string): {
  fixNowVsWait?: FixNowVsWait;
  costEstimateLow?: number;
  costEstimateHigh?: number;
} {
  if (!raw?.trim()) {
    return {};
  }

  try {
    const payload = JSON.parse(raw) as {
      fix_now_vs_wait?: FixNowVsWait;
      cost_estimate_low?: number;
      cost_estimate_high?: number;
    };

    return {
      fixNowVsWait: payload.fix_now_vs_wait,
      costEstimateLow: payload.cost_estimate_low,
      costEstimateHigh: payload.cost_estimate_high,
    };
  } catch {
    return {};
  }
}

async function loadDiagnosis(
  diagnosisId: string,
): Promise<DiagnosisFields | undefined> {
  const client = getAirtableClient();

  try {
    const record = await client.getRecord<DiagnosisFields>(
      "diagnoses",
      diagnosisId,
    );
    return record.fields;
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function getBookingSummary(jobId: string): Promise<BookingSummary> {
  const job = await getJobById(jobId);
  const diagnosisId = job.fields.diagnosis_id?.[0];
  const diagnosisFields = diagnosisId
    ? await loadDiagnosis(diagnosisId)
    : undefined;

  const parsedRaw = parseDiagnosisPayload(diagnosisFields?.ai_response_raw);
  const parsedEstimate = parseCostEstimate(
    diagnosisFields?.ai_response_cost_estimate,
  );

  const mechanicId = job.fields.mechanic_id?.[0];
  let mechanic: BookingSummary["mechanic"];
  if (mechanicId) {
    const mechanicRecord = await getMechanicById(mechanicId);
    mechanic = {
      id: mechanicRecord.id,
      name: mechanicRecord.fields.name ?? "Verified mechanic",
      profilePhotoUrl: mechanicRecord.fields.profile_photo_url,
      certifiedStatus: mechanicRecord.fields.certified_status,
    };
  }

  return {
    jobId,
    status: jobStatusOr(job.fields.status),
    zip: job.fields.zip_code,
    serviceType: job.fields.service_type,
    scheduledTime: job.fields.scheduled_time,
    safetyFlag: job.fields.safety_flag,
    vehicleYear: job.fields.vehicle_year,
    vehicleMake: job.fields.vehicle_make,
    vehicleModel: job.fields.vehicle_model,
    vin: job.fields.vin,
    issueText: job.fields.issue_text,
    diagnosis: {
      summary: diagnosisFields?.ai_response_summary,
      category: asDiagnosisCategory(diagnosisFields?.ai_response_category),
      driveability: asDriveability(diagnosisFields?.ai_response_driveability),
      fixNowVsWait: parsedRaw.fixNowVsWait,
      costEstimateLow: parsedRaw.costEstimateLow ?? parsedEstimate.low,
      costEstimateHigh: parsedRaw.costEstimateHigh ?? parsedEstimate.high,
      confidence: diagnosisFields?.ai_response_confidence,
    },
    mechanic,
    signedUrl: await buildSignedJobUrl(jobId),
  };
}
