import { getAirtableClient } from "@/lib/airtable";
import { isGwinnettZip } from "@/lib/bookings/validate-intake";
import {
  applicationReceived,
  sendSms,
} from "@/lib/twilio";
import { normalizeUsPhone } from "@/lib/phone";
import type { MechanicStatus } from "@/types/airtable/enums";
import type { ActionItemFields } from "@/types/airtable/action-items";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { createMechanicSchema } from "@/types/airtable/schemas";
import { InvalidZipError } from "./errors";
import { findMechanicByPhone } from "./lookup";
import { mapServiceCategories } from "./map-categories";

export class DuplicatePhoneError extends Error {
  constructor() {
    super("A mechanic application already exists for this phone number.");
    this.name = "DuplicatePhoneError";
  }
}

export type MechanicApplicationInput = {
  fullName: string;
  phone: string;
  email?: string;
  bio?: string;
  languages?: string;
  yearsExperience?: number;
  aseCertified?: boolean;
  otherCertifications?: string;
  services: Record<string, boolean>;
  mobileAvailable?: boolean;
  shopAvailable?: boolean;
  primaryZip: string;
  additionalZips?: string | string[];
  serviceRadius?: number;
  shopAddress?: string;
  toolsConfirmed?: boolean;
  transportConfirmed?: boolean;
  mobileRepairsConfirmed?: boolean;
  profilePhotoUrl?: string;
  driverLicenseUrl?: string;
  aseCertificationUrl?: string;
  insuranceDocumentUrl?: string;
};

export type SubmitMechanicApplicationResult = {
  mechanicId: string;
  status: MechanicStatus;
};

function parseZipCodes(
  primaryZip: string,
  additionalZips?: string | string[],
): string[] {
  const zips = [primaryZip.trim()];
  if (additionalZips) {
    const extra = Array.isArray(additionalZips)
      ? additionalZips
      : additionalZips.split(/[,\s]+/);
    zips.push(...extra.map((zip) => zip.trim()));
  }
  return [...new Set(zips.filter(Boolean))];
}

function assertPilotServiceZips(zips: string[]): void {
  for (const zip of zips) {
    if (!isGwinnettZip(zip)) {
      throw new InvalidZipError(
        "This ZIP code is outside our current service area.",
      );
    }
  }
}

function attachmentFromUrl(
  url?: string,
): Array<{ url: string }> | undefined {
  const trimmed = url?.trim();
  if (!trimmed) {
    return undefined;
  }
  return [{ url: trimmed }];
}

function attachmentFieldsFromUrls(input: {
  profilePhotoUrl?: string;
  driverLicenseUrl?: string;
  aseCertificationUrl?: string;
  insuranceDocumentUrl?: string;
}): Partial<MechanicFields> {
  const fields: Partial<MechanicFields> = {};
  const profilePhoto = attachmentFromUrl(input.profilePhotoUrl);
  if (profilePhoto) {
    fields.profile_photo = profilePhoto as MechanicFields["profile_photo"];
  }
  const driverLicense = attachmentFromUrl(input.driverLicenseUrl);
  if (driverLicense) {
    fields.driver_license = driverLicense as MechanicFields["driver_license"];
  }
  const aseCertification = attachmentFromUrl(input.aseCertificationUrl);
  if (aseCertification) {
    fields.ase_certification =
      aseCertification as MechanicFields["ase_certification"];
  }
  const insuranceDocument = attachmentFromUrl(input.insuranceDocumentUrl);
  if (insuranceDocument) {
    fields.insurance_document =
      insuranceDocument as MechanicFields["insurance_document"];
  }
  return fields;
}

export async function submitMechanicApplication(
  input: MechanicApplicationInput,
): Promise<SubmitMechanicApplicationResult> {
  const phoneE164 = normalizeUsPhone(input.phone);

  const existing = await findMechanicByPhone(phoneE164);
  if (existing) {
    throw new DuplicatePhoneError();
  }

  const serviceZipCodes = parseZipCodes(input.primaryZip, input.additionalZips);
  assertPilotServiceZips(serviceZipCodes);

  const mechanicFields = createMechanicSchema.parse({
    status: "application_submitted",
    full_name: input.fullName,
    phone: phoneE164,
    email: input.email,
    bio: input.bio,
    languages: input.languages,
    years_experience: input.yearsExperience,
    ase_certified: input.aseCertified,
    other_certifications: input.otherCertifications,
    service_zip_codes: serviceZipCodes,
    service_categories: mapServiceCategories(input.services),
    tools_confirmed: input.toolsConfirmed,
    transport_confirmed: input.transportConfirmed,
    mobile_repairs_confirmed: input.mobileRepairsConfirmed,
    mobile_available: input.mobileAvailable,
    shop_available: input.shopAvailable,
    shop_address: input.shopAddress,
    service_radius: input.serviceRadius,
  });

  const attachmentFields = attachmentFieldsFromUrls(input);

  const client = getAirtableClient();
  const mechanic = await client.createRecord<MechanicFields>(
    "mechanics",
    {
      ...mechanicFields,
      ...attachmentFields,
    },
    { typecast: true },
  );

  const actionItemFields: Partial<ActionItemFields> = {
    type: "new_mechanic_application",
    status: "open",
    title: "New mechanic application",
    mechanic: [mechanic.id],
  };

  await client.createRecord<ActionItemFields>(
    "action-items",
    actionItemFields,
    { typecast: true },
  );

  try {
    await sendSms(phoneE164, applicationReceived());
  } catch (error) {
    console.error("Failed to send application-received SMS:", error);
  }

  return {
    mechanicId: mechanic.id,
    status: mechanic.fields.status ?? "application_submitted",
  };
}
