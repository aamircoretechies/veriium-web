import { GWINNETT_ZIP_CODES } from "@/lib/constants/gwinnett-zips";
import { toAirtableAttachments, InvalidAttachmentUrlError } from "@/lib/cloudinary/validate-url";
import type { BookingRequest, BookingVehicle } from "@/types/api/booking";
import type { ServiceType } from "@/types/airtable/enums";
import type { JobFields } from "@/types/airtable/jobs";
import { InvalidScheduledTimeError, OutOfServiceAreaError } from "./errors";
import type { ResolvedVehicle } from "./resolve-vehicle";
import {
  buildScheduledTimeIso,
} from "./scheduled-time";

const GWINNETT_ZIP_SET = new Set<string>(GWINNETT_ZIP_CODES);

export type ValidatedBookingIntake = {
  diagnosisId: string;
  name: string;
  zip: string;
  phone: string;
  email?: string;
  serviceType: ServiceType;
  vehicle?: BookingVehicle;
  additionalDetails?: string;
  scheduledTime?: string;
  verificationCode: string;
  attachments?: { url: string }[];
};

export type JobIntakeFields = Pick<
  JobFields,
  | "vehicle_year"
  | "vehicle_make"
  | "vehicle_model"
  | "vin"
  | "issue_text"
  | "scheduled_time"
>;

/** Map UI `onsite` to Airtable `mobile_repair`. */
export function normalizeServiceType(
  serviceType: BookingRequest["serviceType"],
): ServiceType {
  if (serviceType === "onsite" || serviceType === "mobile_repair") {
    return "mobile_repair";
  }
  return "dropoff";
}

export function isGwinnettZip(zip: string): boolean {
  return GWINNETT_ZIP_SET.has(zip.trim());
}

export function assertGwinnettZip(zip: string): void {
  if (!isGwinnettZip(zip)) {
    throw new OutOfServiceAreaError();
  }
}

function normalizeVehicle(
  vehicle?: BookingVehicle,
): BookingVehicle | undefined {
  if (!vehicle) {
    return undefined;
  }

  const normalized: BookingVehicle = {
    year: vehicle.year,
    make: vehicle.make?.trim() || undefined,
    model: vehicle.model?.trim() || undefined,
    vin: vehicle.vin?.trim() || undefined,
  };

  if (
    normalized.year === undefined &&
    !normalized.make &&
    !normalized.model &&
    !normalized.vin
  ) {
    return undefined;
  }

  return normalized;
}

function resolveScheduledTime(request: BookingRequest): string | undefined {
  if (request.scheduleSlot) {
    return buildScheduledTimeIso(
      request.scheduleSlot.month,
      request.scheduleSlot.day,
      request.scheduleSlot.time,
    );
  }

  return request.scheduledTime;
}

function assertFutureScheduledTime(scheduledTime: string): void {
  const scheduledMs = Date.parse(scheduledTime);
  if (!Number.isFinite(scheduledMs) || scheduledMs <= Date.now()) {
    throw new InvalidScheduledTimeError();
  }
}

function normalizeAttachments(
  attachmentUrls?: string[],
): { url: string }[] | undefined {
  if (!attachmentUrls?.length) {
    return undefined;
  }

  try {
    return toAirtableAttachments(attachmentUrls);
  } catch (error) {
    if (error instanceof InvalidAttachmentUrlError) {
      throw error;
    }
    throw new InvalidAttachmentUrlError();
  }
}

/** Business rules on top of Zod parsing (ZIP allowlist, service type, trimming). */
export function validateBookingIntake(
  request: BookingRequest,
): ValidatedBookingIntake {
  const zip = request.zip.trim();
  assertGwinnettZip(zip);

  const scheduledTime = resolveScheduledTime(request);
  if (scheduledTime) {
    assertFutureScheduledTime(scheduledTime);
  }

  return {
    diagnosisId: request.diagnosisId,
    name: request.name.trim(),
    zip,
    phone: request.phone.trim(),
    email: request.email?.trim() || undefined,
    serviceType: normalizeServiceType(request.serviceType),
    vehicle: normalizeVehicle(request.vehicle),
    additionalDetails: request.additionalDetails?.trim() || undefined,
    scheduledTime,
    verificationCode: request.verificationCode,
    attachments: normalizeAttachments(request.attachmentUrls),
  };
}

/** Map validated intake to Airtable Jobs columns (§5.4). */
export function toJobIntakeFields(
  intake: Pick<
    ValidatedBookingIntake,
    "vehicle" | "additionalDetails" | "scheduledTime"
  >,
  resolvedVehicle?: ResolvedVehicle,
): JobIntakeFields {
  const fields: JobIntakeFields = {};
  const vehicle = resolvedVehicle ?? intake.vehicle;

  if (vehicle?.year !== undefined) {
    fields.vehicle_year = vehicle.year;
  }
  if (vehicle?.make) {
    fields.vehicle_make = vehicle.make;
  }
  if (vehicle?.model) {
    fields.vehicle_model = vehicle.model;
  }
  if (vehicle?.vin) {
    fields.vin = vehicle.vin;
  }
  if (intake.additionalDetails) {
    fields.issue_text = intake.additionalDetails;
  }
  if (intake.scheduledTime) {
    fields.scheduled_time = intake.scheduledTime;
  }

  return fields;
}
