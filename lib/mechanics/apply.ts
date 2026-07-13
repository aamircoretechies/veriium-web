import { getAirtableClient } from "@/lib/airtable";
import { isGwinnettZip } from "@/lib/bookings/validate-intake";
import {
  applicationReceived,
  sendSms,
} from "@/lib/twilio";
import { normalizeUsPhone } from "@/lib/phone";
import type { MechanicStatus } from "@/types/airtable/enums";
import { ACTION_ITEM_TYPE } from "@/types/airtable/enums";
import type { ActionItemFields } from "@/types/airtable/action-items";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { createActionItemSchema, createMechanicSchema } from "@/types/airtable/schemas";
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

function buildCertificationsBlock(input: MechanicApplicationInput): string {
  const lines: string[] = [];
  if (input.yearsExperience !== undefined) {
    lines.push(`Years experience: ${input.yearsExperience}`);
  }
  if (input.otherCertifications?.trim()) {
    lines.push(input.otherCertifications.trim());
  }
  if (input.driverLicenseUrl?.trim()) {
    lines.push(`Driver license: ${input.driverLicenseUrl.trim()}`);
  }
  if (input.aseCertificationUrl?.trim()) {
    lines.push(`ASE certification: ${input.aseCertificationUrl.trim()}`);
  }
  if (input.insuranceDocumentUrl?.trim()) {
    lines.push(`Insurance: ${input.insuranceDocumentUrl.trim()}`);
  }
  return lines.join("\n");
}

function parseLanguages(raw?: string): Array<"English" | "Spanish" | "Other"> {
  if (!raw?.trim()) return ["English"];
  const values = raw
    .split(/[,\s/]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const mapped = new Set<"English" | "Spanish" | "Other">();
  for (const value of values) {
    if (value.startsWith("en")) mapped.add("English");
    else if (value.startsWith("sp")) mapped.add("Spanish");
    else mapped.add("Other");
  }
  return mapped.size > 0 ? [...mapped] : ["English"];
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

  if (input.shopAvailable && !input.shopAddress?.trim()) {
    throw new Error("Shop address is required for drop-off availability.");
  }

  const mechanicFields = createMechanicSchema.parse({
    name: input.fullName,
    phone_number: phoneE164,
    email: input.email,
    bio: input.bio,
    languages: parseLanguages(input.languages),
    certifications: buildCertificationsBlock(input),
    certified_status: input.aseCertified ? "certified" : "not_certified",
    service_zip_codes: serviceZipCodes.join("\n"),
    service_categories: mapServiceCategories(input.services),
    tools_confirmed: input.toolsConfirmed ? ["Basic tool kit" as const] : undefined,
    shop_address: input.shopAddress,
    profile_photo_url: input.profilePhotoUrl,
    approved: false,
    background_check_status: "not_submitted",
  });

  const client = getAirtableClient();
  const mechanic = await client.createRecord<MechanicFields>(
    "mechanics",
    mechanicFields as Partial<MechanicFields>,
    { typecast: true },
  );

  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.PENDING_MECHANIC_APPROVAL,
    status: "open",
    description: `New mechanic application from ${input.fullName} (${phoneE164}).`,
    linked_mechanic_id: [mechanic.id],
  });

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
    status: "application_submitted",
  };
}
