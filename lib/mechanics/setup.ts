import { getAirtableClient } from "@/lib/airtable";
import {
  type MechanicAuthSummary,
  toMechanicAuthSummary,
} from "@/lib/auth/mechanic-otp";
import { isGwinnettZip } from "@/lib/bookings/validate-intake";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { updateMechanicSchema } from "@/types/airtable/schemas";
import { getMechanicById } from "./lookup";

export class MechanicNotEligibleForSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MechanicNotEligibleForSetupError";
  }
}

export class MechanicSetupIncompleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MechanicSetupIncompleteError";
  }
}

export type CompleteMechanicSetupInput = {
  serviceZipCodes: string[];
};

function assertEligibleForSetup(fields: MechanicFields): void {
  if (!fields.approved) {
    throw new MechanicNotEligibleForSetupError(
      "Only approved mechanics can complete setup.",
    );
  }

  if (fields.background_check_status !== "cleared") {
    throw new MechanicNotEligibleForSetupError(
      "Background check must be cleared before completing setup.",
    );
  }
}

function assertPilotServiceZips(zips: string[]): void {
  for (const zip of zips) {
    if (!isGwinnettZip(zip)) {
      throw new MechanicSetupIncompleteError(
        "This ZIP code is outside our current service area.",
      );
    }
  }
}

function assertProfileComplete(
  fields: MechanicFields,
  serviceZipCodes: string[],
): void {
  const missing: string[] = [];

  if (!fields.profile_photo_url?.trim()) {
    missing.push("profile photo");
  }
  if (serviceZipCodes.length === 0) {
    missing.push("service ZIP codes");
  }
  if (!fields.tools_confirmed?.length) {
    missing.push("tools confirmation");
  }
  if (!fields.service_categories?.length) {
    missing.push("service categories");
  }

  if (missing.length > 0) {
    throw new MechanicSetupIncompleteError(
      `Your profile is missing required information from your application (${missing.join(", ")}). Please contact support.`,
    );
  }
}

export async function completeMechanicSetup(
  mechanicId: string,
  input: CompleteMechanicSetupInput,
): Promise<MechanicAuthSummary> {
  const mechanic = await getMechanicById(mechanicId);
  const { fields } = mechanic;

  assertEligibleForSetup(fields);

  if (fields.setup_wizard_completed_at?.trim()) {
    return toMechanicAuthSummary(mechanic);
  }

  const serviceZipCodes = [...new Set(input.serviceZipCodes.map((zip) => zip.trim()))];
  assertPilotServiceZips(serviceZipCodes);
  assertProfileComplete(fields, serviceZipCodes);

  const now = new Date().toISOString();
  const updateFields = updateMechanicSchema.parse({
    service_zip_codes: serviceZipCodes.join("\n"),
    setup_wizard_completed_at: now,
  });

  const client = getAirtableClient();
  const record = await client.updateRecord<MechanicFields>(
    "mechanics",
    mechanicId,
    updateFields as Partial<MechanicFields>,
    { typecast: true },
  );

  return toMechanicAuthSummary(record);
}
