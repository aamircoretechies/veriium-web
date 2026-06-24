import { getAirtableClient, AirtableError } from "@/lib/airtable";
import { verifyDriverOtp } from "@/lib/auth/driver-otp";
import { buildSignedJobUrl } from "@/lib/auth/signed-url";
import { upsertDriver } from "@/lib/drivers/upsert";
import type { BookingRequest, BookingResponse } from "@/types/api/booking";
import type { DiagnosisFields } from "@/types/airtable/diagnoses";
import type { JobFields } from "@/types/airtable/jobs";
import {
  createJobSchema,
  updateDiagnosisSchema,
} from "@/types/airtable/schemas";
import { DiagnosisNotFoundError } from "./errors";
import {
  toJobIntakeFields,
  validateBookingIntake,
} from "./validate-intake";

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
  const intakeFields = toJobIntakeFields(intake);

  const jobFields = createJobSchema.parse({
    status: "draft",
    driver: [driverId],
    diagnosis: [intake.diagnosisId],
    zip_code: intake.zip,
    diagnosis_category: diagnosis.fields.category,
    service_type: intake.serviceType,
    safety_flag: diagnosis.fields.safety_flag ?? false,
    ...intakeFields,
  });

  const client = getAirtableClient();
  const job = await client.createRecord<JobFields>("jobs", jobFields, {
    typecast: true,
  });

  const diagnosisUpdate = updateDiagnosisSchema.parse({
    driver: [driverId],
    job: [job.id],
  });

  await client.updateRecord<DiagnosisFields>(
    "diagnoses",
    intake.diagnosisId,
    diagnosisUpdate,
    { typecast: true },
  );

  return {
    jobId: job.id,
    driverId,
    signedUrl: await buildSignedJobUrl(job.id),
  };
}
