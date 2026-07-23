import { getAirtableClient, AirtableError } from "@/lib/airtable";
import { verifyDriverOtp } from "@/lib/auth/driver-otp";
import { buildSignedJobUrl } from "@/lib/auth/signed-url";
import { upsertDriver } from "@/lib/drivers/upsert";
import type { BookingRequest, BookingResponse } from "@/types/api/booking";
import type { DiagnosisFields } from "@/types/airtable/diagnoses";
import type { JobFields } from "@/types/airtable/jobs";
import type { DiagnosisCategory } from "@/types/airtable/enums";
import {
  createJobSchema,
  updateDiagnosisSchema,
} from "@/types/airtable/schemas";
import { DiagnosisNotFoundError } from "./errors";
import { resolveVehicle } from "./resolve-vehicle";
import {
  toJobIntakeFields,
  validateBookingIntake,
} from "./validate-intake";

function parseDiagnosisRaw(raw?: string): {
  safety_flag?: boolean;
} {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as { safety_flag?: boolean };
  } catch {
    return {};
  }
}

async function loadDiagnosis(diagnosisId: string) {
  const client = getAirtableClient();

  try {
    return await client.getRecord<DiagnosisFields>("diagnoses", diagnosisId);
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      throw new DiagnosisNotFoundError();
    }
    throw error;
  }
}

export async function createBooking(
  request: BookingRequest,
): Promise<BookingResponse> {
  const intake = validateBookingIntake(request);

  await verifyDriverOtp(intake.phone, intake.verificationCode);

  const { driverId } = await upsertDriver({
    phone: intake.phone,
    name: intake.name,
    email: intake.email,
  });

  const diagnosis = await loadDiagnosis(intake.diagnosisId);
  const resolvedVehicle = await resolveVehicle(intake.vehicle);
  const intakeFields = toJobIntakeFields(intake, resolvedVehicle);
  const rawMeta = parseDiagnosisRaw(diagnosis.fields.ai_response_raw);

  const jobFields = createJobSchema.parse({
    status: "draft",
    driver_id: [driverId],
    diagnosis_id: [intake.diagnosisId],
    zip_code: intake.zip,
    diagnosis_category: diagnosis.fields
      .ai_response_category as DiagnosisCategory,
    service_type: intake.serviceType,
    safety_flag: rawMeta.safety_flag ?? false,
    ...intakeFields,
  });

  const client = getAirtableClient();
  const job = await client.createRecord<JobFields>("jobs", jobFields, {
    typecast: true,
  });

  const diagnosisUpdate = updateDiagnosisSchema.parse({
    driver_id: [driverId],
    job_id: [job.id],
    ...(intake.attachments?.length ? { attachments: intake.attachments } : {}),
  });

  await client.updateRecord<DiagnosisFields>(
    "diagnoses",
    intake.diagnosisId,
    diagnosisUpdate as Partial<DiagnosisFields>,
    { typecast: true },
  );

  return {
    jobId: job.id,
    driverId,
    signedUrl: await buildSignedJobUrl(job.id),
  };
}
